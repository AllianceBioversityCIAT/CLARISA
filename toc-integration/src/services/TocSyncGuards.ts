import { DataSource } from "typeorm";
import { Database } from "../database/db";
import { TocSyncError } from "../types/toc-sync-error";
import { isResultNode } from "../utils/toc-v3";

export interface PlausibilityCounts {
  resultNodes: number;
  incomingIndicators: number;
  existingActiveIndicators: number;
}

export interface PlausibilityMeta {
  phase: string | null;
  original_id: string | null;
  official_code: string | null;
}

/**
 * Guard against the "migration gap" documented by the ToC team: during the
 * v2 -> v3 transition the API served programs with 0 indicators or 0 outputs.
 * A sync that deletes what is missing would wipe real data, so we refuse to
 * write when the payload looks empty but the database does not.
 */
export async function assertSyncPlausibility(
  envelope: any,
  meta: PlausibilityMeta
): Promise<PlausibilityCounts> {
  const data: any[] = Array.isArray(envelope?.data) ? envelope.data : [];
  const resultNodes = data.filter(isResultNode);

  if (resultNodes.length === 0) {
    throw new TocSyncError({
      statusCode: 422,
      code: "PLAUSIBILITY_NO_RESULTS",
      message:
        "Sync aborted: the ToC payload has no OUTPUT/OUTCOME/EOI nodes. No writes performed.",
      notifySlack: true,
      details: { nodes: data.length },
    });
  }

  const rootIndicators = Array.isArray(envelope?.quantitative_indicators)
    ? envelope.quantitative_indicators.length
    : 0;
  const embeddedIndicators = resultNodes.reduce((acc, node) => {
    const list = Array.isArray(node?.quantitative_indicators)
      ? node.quantitative_indicators
      : Array.isArray(node?.indicators)
        ? node.indicators
        : [];
    return acc + list.length;
  }, 0);
  const incomingIndicators = Math.max(rootIndicators, embeddedIndicators);

  let existingActiveIndicators = 0;
  if (incomingIndicators === 0) {
    existingActiveIndicators = await countActiveIndicators(meta);
    if (existingActiveIndicators > 0) {
      throw new TocSyncError({
        statusCode: 409,
        code: "PLAUSIBILITY_NO_INDICATORS",
        message: `Sync aborted: the ToC payload has 0 indicators but the database has ${existingActiveIndicators} active indicators for this program and phase. No writes performed.`,
        notifySlack: true,
        details: {
          resultNodes: resultNodes.length,
          existingActiveIndicators,
          phase: meta.phase,
          original_id: meta.original_id,
          official_code: meta.official_code,
        },
      });
    }
  }

  return {
    resultNodes: resultNodes.length,
    incomingIndicators,
    existingActiveIndicators,
  };
}

async function countActiveIndicators(meta: PlausibilityMeta): Promise<number> {
  if (!meta.phase) return 0;
  const dataSource: DataSource = await Database.getDataSource();
  const rows = await dataSource.query(
    `SELECT COUNT(*) AS cnt
       FROM toc_results_indicators tri
       INNER JOIN toc_results tr ON tr.id = tri.toc_results_id
      WHERE tri.is_active = 1
        AND tr.phase = ?
        AND (tr.id_toc_initiative = ? OR tr.official_code = ?)`,
    [meta.phase, meta.original_id ?? "", meta.official_code ?? ""]
  );
  const cnt = Number(rows?.[0]?.cnt ?? 0);
  return Number.isFinite(cnt) ? cnt : 0;
}
