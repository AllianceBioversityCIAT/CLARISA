export interface SpSyncMeta {
  phase: string | null;
  original_id: string | null;
  version_id: string | null;
  official_code: string;
  reporting_year?: number | null;
  version?: number | null;
  toc_type?: string | null;
}

export const TOC_PHASE_2025_ID = "99134294-d7a1-4966-a63e-227c9e29b9fb";
export const TOC_PHASE_2026_ID = "7baf200a-c958-4ded-9894-6557a94cae18";
export const DEFAULT_REPORTING_YEAR = 2025;

export const PHASE_ID_BY_REPORTING_YEAR: Record<number, string> = {
  2025: TOC_PHASE_2025_ID,
  2026: TOC_PHASE_2026_ID,
};

export function resolvePhaseId(inputPhaseId?: string | null): string {
  const trimmed = typeof inputPhaseId === "string" ? inputPhaseId.trim() : "";
  if (trimmed) {
    return trimmed;
  }

  const fromEnv = process.env.TOC_DEFAULT_PHASE_ID?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return TOC_PHASE_2025_ID;
}

export function parseReportingYearInput(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function resolvePhaseIdFromReportingYear(year: number): string | null {
  return PHASE_ID_BY_REPORTING_YEAR[year] ?? null;
}
