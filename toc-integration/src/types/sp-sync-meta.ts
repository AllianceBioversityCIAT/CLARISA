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
