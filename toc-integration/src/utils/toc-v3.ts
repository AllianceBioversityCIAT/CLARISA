/**
 * Pure helpers to read the ToC API v3 payload (NestJS backend, live since
 * 2026-09-04) while keeping compatibility with v2 snapshots.
 *
 * Every helper accepts the new key first and falls back to the legacy key, so
 * old snapshots (before mid-2026) keep parsing. See
 * docs/toc-api-v3-compat-gap.md for the field-by-field diff.
 */

export interface EnvelopePhase {
  phaseId: string | null;
  reportingYear: number | null;
  phaseName: string | null;
}

/**
 * v2 sent `phase` as a uuid string; v3 sends an object
 * `{ id, name, reporting_year, start_date, end_date, active, status }`.
 */
export function resolveEnvelopePhase(envelope: any): EnvelopePhase {
  const phase = envelope?.phase;

  if (typeof phase === "string" || typeof phase === "number") {
    const id = String(phase).trim();
    return { phaseId: id || null, reportingYear: null, phaseName: null };
  }

  if (phase && typeof phase === "object") {
    const id =
      typeof phase.id === "string" || typeof phase.id === "number"
        ? String(phase.id).trim()
        : null;
    return {
      phaseId: id || null,
      reportingYear: parseFiniteNumber(phase.reporting_year),
      phaseName: typeof phase.name === "string" ? phase.name : null,
    };
  }

  return { phaseId: null, reportingYear: null, phaseName: null };
}

/**
 * Mapping validated by the PRMS Planning team over 818 indicators (0 losses).
 * Keys are compared trimmed and case-insensitive.
 */
const INDICATOR_TYPE_LEGACY_VALUES: Record<string, string> = {
  "innovation development": "Number of innovations (innovation development)",
  "innovation use": "Innovation Use",
  "knowledge products": "Number of knowledge products",
  "capacity sharing":
    "Number of people trained (capacity sharing for development)",
  "policy change": "Number of Policy (Policy Change)",
  "other outputs": "custom",
  "other outcomes": "custom",
};

/**
 * Translate a v3 `indicator_type.name` label into the legacy `type.value`
 * value space that PRMS aggregates on. Unknown labels pass through verbatim;
 * null/empty becomes "".
 */
export function mapIndicatorTypeToLegacyValue(
  name: string | null | undefined
): string {
  if (typeof name !== "string") return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  const mapped = INDICATOR_TYPE_LEGACY_VALUES[trimmed.toLowerCase()];
  return mapped ?? trimmed;
}

/**
 * Resolve `{ type_name, type_value }` for an indicator.
 * - v2: `type: { name, value }`
 * - v3: `indicator_type: { id, name, ... } | null`, no `type`
 */
export function resolveIndicatorType(ind: any): { name: string; value: string } {
  const v3Name =
    typeof ind?.indicator_type?.name === "string"
      ? ind.indicator_type.name
      : null;
  const legacyName =
    typeof ind?.type?.name === "string" ? ind.type.name : null;
  const legacyValue =
    typeof ind?.type?.value === "string" ? ind.type.value : null;

  const name = v3Name ?? legacyName ?? "";
  const value = legacyValue ?? mapIndicatorTypeToLegacyValue(v3Name);
  return { name, value };
}

/**
 * v2: `unit_of_measurement: "Number"`; v3: `{ id, value, toc_id }`.
 */
export function resolveUnitOfMeasurement(unit: any): string {
  if (typeof unit === "string") return unit;
  if (unit && typeof unit === "object" && typeof unit.value === "string") {
    return unit.value;
  }
  return "";
}

/**
 * v3 sends `Global` / `Regional` / `Country`; v2 sent lowercase. Consumers
 * (PRMS reads the DB directly) compare lowercase, so we normalise on save.
 */
export function normalizeLocation(location: any): string | null {
  if (typeof location !== "string") return null;
  const trimmed = location.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

/**
 * Result nodes use singular `region[]` / `country[]`; indicators, MELIAs and
 * target rows use plural `regions[]` / `countries[]`. Accept both.
 */
export function pickGeoArrays(obj: any): { regions: any[]; countries: any[] } {
  const regions = Array.isArray(obj?.regions)
    ? obj.regions
    : Array.isArray(obj?.region)
      ? obj.region
      : [];
  const countries = Array.isArray(obj?.countries)
    ? obj.countries
    : Array.isArray(obj?.country)
      ? obj.country
      : [];
  return { regions, countries };
}

export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const YEAR_KEY = /^\d{4}$/;

/**
 * Sum a list of year-grid rows (`{ "2020": 0, ..., "2030": 2, total: 2 }`).
 * `total` prefers the rows' own `total` when present, else the year cells.
 */
export function sumYearGrid(rows: any[]): {
  byYear: Record<string, number>;
  total: number;
  hasAny: boolean;
} {
  const byYear: Record<string, number> = {};
  let total = 0;
  let hasAny = false;
  let sawRowTotal = false;

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== "object") continue;
    let rowYearsSum = 0;
    for (const key of Object.keys(row)) {
      if (!YEAR_KEY.test(key)) continue;
      const n = parseFiniteNumber(row[key]);
      if (n == null) continue;
      hasAny = true;
      byYear[key] = (byYear[key] ?? 0) + n;
      rowYearsSum += n;
    }
    const rowTotal = parseFiniteNumber(row.total);
    if (rowTotal != null) {
      hasAny = true;
      sawRowTotal = true;
      total += rowTotal;
    } else {
      total += rowYearsSum;
    }
  }

  if (!sawRowTotal) {
    total = Object.keys(byYear).reduce((acc, k) => acc + byYear[k], 0);
  }
  return { byYear, total, hasAny };
}

/**
 * Baselines are stored in two varchar columns (`baseline_value`,
 * `baseline_date`). v3 sends a per-centre year grid with no date semantics,
 * so we persist the aggregated total and leave the date empty. Legacy
 * snapshots (`baseline[0].value` / `.name` / `.date`) keep their behaviour.
 */
export function computeBaselineSummary(ind: any): {
  value: string;
  date: string;
} {
  const totals = ind?.baselines_totals;
  const totalsTotal = parseFiniteNumber(totals?.total);
  if (totalsTotal != null) {
    return { value: String(totalsTotal), date: "" };
  }

  if (Array.isArray(ind?.baselines) && ind.baselines.length) {
    const grid = sumYearGrid(ind.baselines);
    if (grid.hasAny) {
      return { value: String(grid.total), date: "" };
    }
  }

  const legacy = Array.isArray(ind?.baseline)
    ? ind.baseline[0]
    : Array.isArray(ind?.baselines)
      ? ind.baselines[0]
      : ind?.baseline;
  const value =
    legacy && legacy.value != null ? String(legacy.value) : "";
  const date =
    typeof legacy?.name === "string"
      ? legacy.name
      : typeof legacy?.date === "string"
        ? legacy.date
        : "";
  return { value, date };
}

/** Category of a node, upper-cased, or null. */
export function nodeCategory(node: any): string | null {
  return typeof node?.category === "string"
    ? node.category.trim().toUpperCase()
    : null;
}

export const RESULT_CATEGORIES = ["OUTPUT", "OUTCOME", "EOI"];

export function isResultNode(node: any): boolean {
  const cat = nodeCategory(node);
  return cat != null && RESULT_CATEGORIES.indexOf(cat) !== -1;
}
