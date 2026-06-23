import { Repository } from "typeorm";
import { Database } from "../database/db";
import { ValidatorTypes } from "../validators/validatorType";
import { TocWorkPackages } from "../entities/tocWorkPackages";
import { SpSyncMeta } from "../types/sp-sync-meta";

const LEGACY_DEFAULT_YEAR = 2025;

export class ToCWorkPackagesService {
  private validator = new ValidatorTypes();

  async saveWorkPackagesV2(data: any[], meta?: SpSyncMeta) {
    console.info({ message: "Creating ToC Work Packages V2" });
    const dataSource = await Database.getDataSource();
    const repo = dataSource.getRepository(TocWorkPackages);
    const workPackages: TocWorkPackages[] = [];

    if (!this.validator.validatorIsArray(data)) return { workPackages };

    const items = data.filter(
      (item) => item && (item.category === "WP" || item.category === "wp")
    );

    for (const item of items) {
      const ost = item?.ost_wp || {};
      console.info({
        message: "Processing work package",
        acronym: ost?.acronym,
      });

      const rawId =
        typeof item?.id === "string" || typeof item?.id === "number"
          ? String(item.id)
          : undefined;
      const tocId =
        typeof ost?.toc_id === "string" || typeof ost?.toc_id === "number"
          ? String(ost.toc_id)
          : null;
      const officialCode =
        typeof ost?.wp_official_code === "string"
          ? ost.wp_official_code
          : typeof ost?.wp_official_code === "number"
            ? String(ost.wp_official_code)
            : null;

      if (!officialCode || !tocId) continue;

      const year = this.resolveWorkPackageYear(meta, ost);
      if (year == null) {
        console.warn({
          message: "Skipping work package without resolvable year",
          tocId,
          acronym: ost?.acronym,
        });
        continue;
      }

      const phase =
        typeof meta?.phase === "string" && meta.phase.trim()
          ? meta.phase.trim()
          : null;

      const record: Partial<TocWorkPackages> = {
        toc_id: tocId,
        year,
        phase,
        id: rawId ?? null,
        acronym: typeof ost?.acronym === "string" ? ost.acronym : null,
        source: typeof ost?.source === "string" ? ost.source : null,
        wp_official_code: officialCode,
        name: typeof ost?.name === "string" ? ost.name : null,
        wp_type:
          typeof item?.wp_type === "string" || typeof item?.wp_type === "number"
            ? String(item.wp_type)
            : null,
        initiativeId:
          typeof ost?.initiativeId === "string" ||
          typeof ost?.initiativeId === "number"
            ? String(ost.initiativeId)
            : null,
      };

      const existing = await this.findExistingWorkPackage(
        repo,
        tocId,
        officialCode,
        year,
        phase
      );

      if (existing) {
        record.id = rawId ?? existing.id ?? null;
        await repo.update({ toc_id: existing.toc_id, year: existing.year }, record);
      } else {
        record.id = rawId ?? `${tocId}-${officialCode}`;
        await repo.insert(record as TocWorkPackages);
      }

      const fresh = await repo.findOne({ where: { toc_id: tocId, year } });
      if (fresh) workPackages.push(fresh);
    }

    return { workPackages };
  }

  private resolveWorkPackageYear(meta: SpSyncMeta | undefined, ost: any): number | null {
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
    tocId: string,
    officialCode: string,
    year: number,
    phase: string | null
  ): Promise<TocWorkPackages | null> {
    const byTocIdAndYear = await repo.findOne({
      where: { toc_id: tocId, year },
    });
    if (byTocIdAndYear) {
      return byTocIdAndYear;
    }

    if (phase) {
      const byTocIdAndPhase = await repo.findOne({
        where: { toc_id: tocId, phase },
      });
      if (byTocIdAndPhase) {
        return byTocIdAndPhase;
      }
    }

    const byCodeAndYear = await repo.findOne({
      where: { wp_official_code: officialCode, year },
    });
    if (byCodeAndYear) {
      return byCodeAndYear;
    }

    if (phase) {
      const byCodeAndPhase = await repo.findOne({
        where: { wp_official_code: officialCode, phase },
      });
      if (byCodeAndPhase) {
        return byCodeAndPhase;
      }
    }

    return null;
  }
}
