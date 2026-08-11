import { ParsedTable } from '../services/glossary-file-parser.service';

/** One entry of the "which column holds the term/definition" pickers. */
export interface ColumnOption {
  label: string;
  /** Index of the column in `ParsedTable.headers` / `ParsedTable.rows`. */
  value: number;
}

/** Columns with an invented header listed in the pickers before we stop. */
export const MAX_GENERATED_COLUMN_OPTIONS = 20;

/**
 * Turns the parsed headers into picker options.
 *
 * Named columns are always listed: they came from the spreadsheet and any of
 * them can legitimately hold the term or the definition. Columns whose header
 * had to be invented (`Column 7`) are capped, because a sheet that reaches the
 * mapping step with hundreds of them is a sheet with stray cells, not a
 * glossary with hundreds of meaningful columns — and an endless list of
 * identical-looking entries helps nobody pick anything.
 *
 * `alwaysKeep` protects the auto-detected columns from being hidden, so the
 * dropdown can never end up showing a blank selection.
 */
export function buildColumnOptions(
  table: Pick<ParsedTable, 'headers' | 'generatedHeaders'>,
  alwaysKeep: (number | null)[] = []
): { options: ColumnOption[]; hiddenCount: number } {
  const pinned = new Set(alwaysKeep.filter((index): index is number => index !== null));
  const options: ColumnOption[] = [];
  let generated = 0;

  table.headers.forEach((header, index) => {
    if (table.generatedHeaders[index]) {
      generated++;
      if (generated > MAX_GENERATED_COLUMN_OPTIONS && !pinned.has(index)) {
        return;
      }
    }
    options.push({ label: header, value: index });
  });

  return { options, hiddenCount: table.headers.length - options.length };
}
