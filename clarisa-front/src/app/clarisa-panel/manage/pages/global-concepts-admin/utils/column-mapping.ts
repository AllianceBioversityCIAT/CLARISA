import { ColumnMatch } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { IMPORT_FIELD_NAMES } from './import-fields';

/**
 * Where the field of a column came from. `manual` always wins: once a person
 * picks a field by hand, neither the exact match nor the AI touches it again.
 */
export type MappingSource = 'exact' | 'ai' | 'manual' | 'none';

export interface ColumnMapping {
  column: number;
  header: string;
  field: string | null;
  source: MappingSource;
  /** 1 for an exact header, the model's 0–1 for AI, null when picked by hand. */
  confidence: number | null;
}

/** Same normalisation as the back's `headerKey`: `TERM ID`, `term_id` and `Term-Id` are one key. */
export function headerKey(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const FIELD_BY_KEY = new Map(IMPORT_FIELD_NAMES.map(field => [headerKey(field), field]));

/**
 * First guess, made locally: a header that normalises to a schema field name
 * is mapped to it. When two headers normalise to the same field the first one
 * keeps it — never two columns on one field.
 */
export function exactMapping(headers: string[]): ColumnMapping[] {
  const taken = new Set<string>();

  return headers.map((header, column) => {
    const field = FIELD_BY_KEY.get(headerKey(header));

    if (field && !taken.has(field)) {
      taken.add(field);
      return { column, header, field, source: 'exact', confidence: 1 };
    }
    return { column, header, field: null, source: 'none', confidence: null };
  });
}

/**
 * A person picks `field` for `column`. If another column already held that
 * field it is cleared, and its header is returned so the screen can say so.
 * `field = null` means "Ignore".
 */
export function pickField(
  mappings: ColumnMapping[],
  column: number,
  field: string | null
): { mappings: ColumnMapping[]; clearedFrom: string | null } {
  let clearedFrom: string | null = null;

  const next = mappings.map(mapping => {
    if (mapping.column === column) {
      return { ...mapping, field, source: 'manual' as MappingSource, confidence: null };
    }
    if (field !== null && mapping.field === field) {
      clearedFrom = mapping.header;
      return { ...mapping, field: null, source: 'none' as MappingSource, confidence: null };
    }
    return mapping;
  });

  return { mappings: next, clearedFrom };
}

/**
 * Applies the AI suggestions. The AI only fills: a column a person set by
 * hand, or one already matched exactly, is left as it is; a field some other
 * column holds is not handed out twice; a field the back does not know is
 * ignored. Returns how many columns the AI filled.
 */
export function applyAiMatches(mappings: ColumnMapping[], matches: ColumnMatch[]): { mappings: ColumnMapping[]; filled: number } {
  const next = mappings.map(mapping => ({ ...mapping }));
  const holder = (field: string) => next.find(mapping => mapping.field === field);
  let filled = 0;

  for (const match of matches ?? []) {
    if (match.source !== 'ai' || !match.field || !IMPORT_FIELD_NAMES.includes(match.field)) continue;

    const target = next.find(mapping => mapping.column === match.column);
    if (!target || target.source === 'manual' || target.source === 'exact') continue;

    const current = holder(match.field);
    if (current && current.column !== target.column) continue;

    target.field = match.field;
    target.source = 'ai';
    target.confidence = typeof match.confidence === 'number' ? match.confidence : null;
    filled++;
  }

  return { mappings: next, filled };
}

/**
 * Turns the sheet into the rows the import endpoints take: one object per row
 * keyed by schema field, plus `__row`, the line of the spreadsheet so errors
 * point at something the person can find. Empty cells are left out (the back
 * never clears a field from an empty cell anyway) and blank rows are dropped.
 *
 * @param headerRow true when the first line of the source was a header, so data starts on line 2.
 * @param sourceLines the parser's line of each row; wins over the offset because blank lines were skipped.
 */
export function buildImportRows(rows: string[][], mappings: ColumnMapping[], headerRow: boolean, sourceLines?: number[]): Record<string, unknown>[] {
  const mapped = mappings.filter((mapping): mapping is ColumnMapping & { field: string } => mapping.field !== null);
  const offset = headerRow ? 2 : 1;
  const out: Record<string, unknown>[] = [];

  rows.forEach((row, index) => {
    const record: Record<string, unknown> = {};

    for (const mapping of mapped) {
      const value = String(row[mapping.column] ?? '').trim();
      if (value) record[mapping.field] = value;
    }

    if (Object.keys(record).length) {
      out.push({ ...record, __row: sourceLines?.[index] ?? index + offset });
    }
  });

  return out;
}

/** Badge text next to a selector: `exact`, `AI 0.87`, or nothing. */
export function confidenceLabel(mapping: ColumnMapping): string | null {
  if (mapping.source === 'exact') return 'exact';
  if (mapping.source === 'ai') return mapping.confidence === null ? 'AI' : `AI ${mapping.confidence.toFixed(2)}`;
  return null;
}
