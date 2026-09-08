import { Repository } from "typeorm";
import { Database } from "../database/db";
import { ValidatorTypes } from "../validators/validatorType";
import { TocWorkPackages } from "../entities/tocWorkPackages";
import { SpSyncMeta } from "../types/sp-sync-meta";

const LEGACY_DEFAULT_YEAR = 2025;

export interface SaveWorkPackagesResult {
  workPackages: TocWorkPackages[];
  /**
   * WP node uuid -> effective `toc_work_packages.toc_id` persisted for it.
   * Results reference their AOW through `group` (= node uuid), so this map is
   * what `saveTocResultsV2` needs to fill `toc_results.wp_id` consistently.
   */
  tocIdByNodeId: Map<string, string>;
}

export class ToCWorkPackagesService {
  private validator = new ValidatorTypes();

  /**
   * ToC API v3 removed `ost_wp.toc_id` (no equivalent). The stable identifier
   * of an AOW is now the WP node `id`, which is what result nodes reference in
   * `group` / `wp.id`. Strategy:
   *  - `toc_id` candidate = `ost_wp.toc_id` (v2 snapshots) or node `id` (v3).
   *  - If a row already exists for this AOW (matched by toc_id, node id or
   *    official code, in that phase/year) we KEEP its `toc_id` and `year`, so
   *    Phase 2025 rows written with the old OST id stay joinable.
   *  - New rows (typically Phase 2026 onwards) use the node uuid as `toc_id`.
   */
  async saveWorkPackagesV2(
    data: any[],
    meta?: SpSyncMeta
  ): Promise<SaveWorkPackagesResult> {
    console.info({ message: "Creating ToC Work Packages V2" });
    const dataSource = await Database.getDataSource();
    const repo = dataSource.getRepository(TocWorkPackages);
    const workPackages: TocWorkPackages[] = [];
    const tocIdByNodeId = new Map<string, string>();

    if (!this.validator.validatorIsArray(data)) {
      return { workPackages, tocIdByNodeId };
    }

    const items = data.filter(
      (item) => item && (item.category === "WP" || item.category === "wp")
    );

    for (const item of items) {
      const ost = item?.ost_wp || {};
      console.info({
        message: "Processing work package",
        acronym: ost?.acronym,
      });

      const nodeId =
        typeof item?.id === "string" || typeof item?.id === "number"
          ? String(item.id)
          : null;
      const payloadTocId =
        typeof ost?.toc_id === "string" || typeof ost?.toc_id === "number"
          ? String(ost.toc_id)
          : null;
      const candidateTocId = payloadTocId ?? nodeId;
      const officialCode =
        typeof ost?.wp_official_code === "string"
          ? ost.wp_official_code
          : typeof ost?.wp_official_code === "number"
            ? String(ost.wp_official_code)
            : null;

      if (!officialCode || !candidateTocId) {
        console.warn({
          message: "Skipping work package without official code or identifier",
          nodeId,
          acronym: ost?.acronym,
        });
        continue;
      }

      const year = this.resolveWorkPackageYear(meta, ost);
      if (year == null) {
        console.warn({
          message: "Skipping work package without resolvable year",
          candidateTocId,
          acronym: ost?.acronym,
        });
        continue;
      }

      const phase =
        typeof meta?.phase === "string" && meta.phase.trim()
          ? meta.phase.trim()
          : null;

      const initiativeIdRaw = ost?.initiative_id ?? ost?.initiativeId;
      const wpTypeRaw = item?.wp_type ?? ost?.wp_type;

      const attributes: Partial<TocWorkPackages> = {
        acronym: typeof ost?.acronym === "string" ? ost.acronym : null,
        source: typeof ost?.source === "string" ? ost.source : null,
        wp_official_code: officialCode,
        name: typeof ost?.name === "string" ? ost.name : null,
        wp_type:
          typeof wpTypeRaw === "string" || typeof wpTypeRaw === "number"
            ? String(wpTypeRaw)
            : null,
        initiativeId:
          typeof initiativeIdRaw === "string" ||
          typeof initiativeIdRaw === "number"
            ? String(initiativeIdRaw)
            : null,
      };

      const existing = await this.findExistingWorkPackage(repo, {
        candidateTocId,
        nodeId,
        officialCode,
        year,
        phase,
      });

      let effectiveTocId: string;
      let effectiveYear: number;

      if (existing) {
        effectiveTocId = existing.toc_id;
        effectiveYear = existing.year;
        const record: Partial<TocWorkPackages> = {
          ...attributes,
          id: nodeId ?? existing.id ?? null,
          phase: phase ?? existing.phase ?? null,
        };
        await repo.update(
          { toc_id: existing.toc_id, year: existing.year },
          record
        );
      } else {
        effectiveTocId = candidateTocId;
        effectiveYear = year;
        const record: Partial<TocWorkPackages> = {
          ...attributes,
          toc_id: candidateTocId,
          year,
          phase,
          id: nodeId ?? `${candidateTocId}-${officialCode}`,
        };
        await repo.insert(record as TocWorkPackages);
      }

      const fresh = await repo.findOne({
        where: { toc_id: effectiveTocId, year: effectiveYear },
      });
      if (fresh) workPackages.push(fresh);
      if (nodeId) tocIdByNodeId.set(nodeId, effectiveTocId);
    }

    return { workPackages, tocIdByNodeId };
  }

  private resolveWorkPackageYear(
    meta: SpSyncMeta | undefined,
    ost: any
  ): number | null {
    if (typeof meta?.reporting_year === "number") {
      return meta.reporting_year;
    }

    if (typeof ost?.year === "string" || typeof ost?.year === "number") {
      const parsed = Number(ost.year);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return LEGACY_DEFAULT_YEAR;
  }

  private async findExistingWorkPackage(
    repo: Repository<TocWorkPackages>,
    keys: {
      candidateTocId: string;
      nodeId: string | null;
      officialCode: string;
      year: number;
      phase: string | null;
    }
  ): Promise<TocWorkPackages | null> {
    const { candidateTocId, nodeId, officialCode, year, phase } = keys;

    const probes: Array<Record<string, string | number>> = [
      { toc_id: candidateTocId, year },
    ];
    if (nodeId) probes.push({ id: nodeId, year });
    if (phase) {
      probes.push({ toc_id: candidateTocId, phase });
      if (nodeId) probes.push({ id: nodeId, phase });
    }
    probes.push({ wp_official_code: officialCode, year });
    if (phase) probes.push({ wp_official_code: officialCode, phase });

    for (const where of probes) {
      const found = await repo.findOne({ where: where as any });
      if (found) return found;
    }

    return null;
  }
}
