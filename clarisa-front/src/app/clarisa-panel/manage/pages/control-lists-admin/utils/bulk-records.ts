import { FieldRow, ListRecord } from '../models/control-lists.models';
import { foldText } from './field-types';
import { BULK_MAX_TEXT_BYTES, MAX_BULK_RECORDS, valueMaxLength } from './limits';
import { ambiguousNumber, FormValue, isOn, longTextTooBig, recordIsActive, recordLabel, toApiValue, toFormValue, utf8Bytes } from './record-values';

/**
 * «Add several records»: what a person pasted, read the way the back will read
 * it, so every problem shows on its cell before anything is sent. One line per
 * record; columns split by TAB only (a comma is part of the value); a cell the
 * spreadsheet quoted keeps its line breaks and tabs.
 *
 * The value of a cell goes through `toApiValue` (decimal comma, date and time,
 * Yes / No), the same conversion «New record» uses; the checks mirror
 * `coerceValue` of the back (`engine/field-types.ts`).
 */

export type ApiValue = string | number | boolean | null;

export interface BulkCell {
  /** What was pasted, trimmed. */
  text: string;
  /** What will be saved, as a person reads it: the option's label, Yes / No, the number sent. The pasted text when it has a problem. */
  shown: string;
  /** What goes on the wire; `null` = empty (left out of the record). */
  value: ApiValue;
  problem: string | null;
}

export interface BulkRow {
  /** 1-based, counting only the records (the header and blank lines do not count): the number the back uses. */
  n: number;
  /** One per field, in field order. */
  cells: BulkCell[];
  /** A problem of the whole row (more columns than fields). */
  problem: string | null;
  hasProblem: boolean;
}

/** How the first line was used: left out as the leading fields in order, or matched to the fields by name. */
export type HeaderUse = 'leading' | 'byName' | null;

export interface BulkParse {
  rows: BulkRow[];
  /** The first line names fields: what the «The first line is a header» box follows until the person sets it. */
  headerDetected: boolean;
  headerSkipped: boolean;
  header: HeaderUse;
  ready: number;
  withProblems: number;
  /** More rows than one request takes. */
  overLimit: boolean;
  /** More text than one request carries. */
  tooMuchText: boolean;
  /** One object per row keyed by field code; only meaningful when `withProblems` is 0. */
  records: Record<string, ApiValue>[];
}

const INT_RE = /^-?\d+$/;
const DEC_RE = /^-?\d+(\.\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const URL_RE = /^https?:\/\/\S+$/i;

const TRUE_WORDS = ['yes', 'true', '1'];
const FALSE_WORDS = ['no', 'false', '0'];

/** Folding of `field-types.ts`, around a trimmed value. */
const fold = (text: string): string => foldText(text.trim());

/** A calendar date (and time) that exists: `Date` rolls 2026-02-30 over to March. */
function realDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (!m) return false;
  const [y, mo, d, h = '0', mi = '0', se = '0'] = m.slice(1);
  const t = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se));
  return (
    t.getUTCFullYear() === +y &&
    t.getUTCMonth() === +mo - 1 &&
    t.getUTCDate() === +d &&
    t.getUTCHours() === +h &&
    t.getUTCMinutes() === +mi &&
    t.getUTCSeconds() === +se
  );
}

/** DECIMAL(18,4) of the back: 14 digits before the point, 4 after it, 15 in all. */
function decimalFits(s: string): boolean {
  const [int, frac = ''] = s.replace('-', '').split('.');
  const intDigits = int.replace(/^0+/, '');
  const fracDigits = frac.replace(/0+$/, '');
  return intDigits.length <= 14 && fracDigits.length <= 4 && intDigits.length + fracDigits.length <= 15;
}

const isCellEnd = (s: string, j: number): boolean => j >= s.length || s[j] === '\t' || s[j] === '\n' || s[j] === '\r';

/**
 * A cell the spreadsheet quoted, from its opening quote: up to the quote that closes it
 * (followed by a tab, a line end or the end), `""` being one quote. `null` when there is
 * no such closing quote: then the leading quote is just text.
 */
function readQuoted(s: string, start: number): { value: string; end: number } | null {
  let out = '';
  for (let j = start + 1; j < s.length; j++) {
    if (s[j] !== '"') {
      out += s[j];
      continue;
    }
    if (s[j + 1] === '"') {
      out += '"';
      j++;
      continue;
    }
    return isCellEnd(s, j + 1) ? { value: out, end: j + 1 } : null;
  }
  return null;
}

/**
 * What a spreadsheet puts on the clipboard: rows of TAB-separated cells, trimmed. A cell that
 * starts with a quote and closes it keeps its line breaks and tabs. Blank lines are skipped
 * and empty cells at the end of a row dropped.
 */
export function splitPaste(text: string): string[][] {
  const s = text ?? '';
  const rows: string[][] = [];
  let cells: string[] = [];
  const endRow = (): void => {
    while (cells.length > 1 && cells[cells.length - 1] === '') cells.pop();
    if (cells.some(c => c !== '')) rows.push(cells);
    cells = [];
  };
  let i = 0;
  for (;;) {
    const quoted = s[i] === '"' ? readQuoted(s, i) : null;
    let value: string;
    if (quoted) {
      value = quoted.value;
      i = quoted.end;
    } else {
      let j = i;
      while (!isCellEnd(s, j)) j++;
      value = s.slice(i, j);
      i = j;
    }
    cells.push(value.trim());
    if (i >= s.length) break;
    if (s[i] === '\t') {
      i++;
      continue;
    }
    i += s[i] === '\r' && s[i + 1] === '\n' ? 2 : 1;
    endRow();
    if (i >= s.length) return rows;
  }
  endRow();
  return rows;
}

export interface HeaderMatch {
  /** For each column of the header, the index of the field it names; `-1` for an empty cell. */
  columns: number[];
  /** The header is exactly the leading fields, in order. */
  leading: boolean;
}

/**
 * The first line is a header when every non-empty cell names a field (its label or its code,
 * without case or accents) and no field is named twice. Any order, any subset.
 */
export function matchHeader(cells: string[], fields: FieldRow[]): HeaderMatch | null {
  const used = new Set<number>();
  const columns: number[] = [];
  for (const cell of cells) {
    if (cell === '') {
      columns.push(-1);
      continue;
    }
    const key = fold(cell);
    const index = fields.findIndex(f => fold(f.label) === key || fold(f.code) === key);
    if (index < 0 || used.has(index)) return null;
    used.add(index);
    columns.push(index);
  }
  if (!used.size) return null;
  return { columns, leading: columns.every((c, i) => c === i) };
}

/** The active options of a relation field; `null` when its list could not be read. */
function activeOptions(field: FieldRow, related: Record<string, ListRecord[] | null>): ListRecord[] | null {
  const rows = field.relation_code ? related[field.relation_code] : undefined;
  if (rows === null) return null;
  return (rows ?? []).filter(recordIsActive);
}

/**
 * The visible label of an active option wins: a list whose options are called «1», «2», «3»
 * must not have «1» read as the record whose id is 1. Only a whole number that names no
 * option is taken as an id, and it must be the id of an active option.
 */
function relationValue(
  field: FieldRow,
  text: string,
  related: Record<string, ListRecord[] | null>
): { value: ApiValue; shown: string; problem: string | null } {
  const listName = field.relation_name || field.relation_code || 'its options list';
  const options = activeOptions(field, related);
  if (options === null) {
    // Its list could not be read: an id goes as written and the back checks it.
    if (INT_RE.test(text)) return { value: Number(text), shown: text, problem: null };
    return { value: null, shown: text, problem: `The options of ${listName} could not be loaded: write the id instead.` };
  }
  const key = fold(text);
  const matches = options.filter(o => fold(recordLabel(o)) === key);
  if (matches.length === 1) return { value: matches[0].id, shown: recordLabel(matches[0]), problem: null };
  if (matches.length > 1) return { value: null, shown: text, problem: `More than one option is called “${text}”: write its id instead.` };
  if (INT_RE.test(text)) {
    const id = Number(text);
    const option = options.find(o => o.id === id);
    if (option) return { value: id, shown: recordLabel(option), problem: null };
  }
  return { value: null, shown: text, problem: `No option “${text}” in ${listName}` };
}

/** One pasted cell → its value for the field, or why it cannot be one. */
export function readCell(field: FieldRow, text: string, related: Record<string, ListRecord[] | null> = {}): BulkCell {
  if (text === '') {
    return { text, shown: '', value: null, problem: isOn(field.is_required) ? 'Required' : null };
  }
  const ok = (value: ApiValue, shown = text): BulkCell => ({ text, shown, value, problem: null });
  const bad = (problem: string): BulkCell => ({ text, shown: text, value: null, problem });
  switch (field.type) {
    case 'relation': {
      const r = relationValue(field, text, related);
      return r.problem ? bad(r.problem) : ok(r.value, r.shown);
    }
    case 'boolean': {
      const word = text.toLowerCase();
      const form: FormValue = TRUE_WORDS.includes(word) ? 'yes' : FALSE_WORDS.includes(word) ? 'no' : '';
      return form ? ok(toApiValue(field, form), form === 'yes' ? 'Yes' : 'No') : bad('Expects yes or no');
    }
    case 'integer': {
      if (!INT_RE.test(text)) return bad('Expects a whole number');
      if (!Number.isSafeInteger(Number(text))) return bad('That number is too large');
      const value = toApiValue(field, text);
      return ok(value, String(value));
    }
    case 'decimal': {
      const ambiguous = ambiguousNumber(text);
      if (ambiguous) return bad(ambiguous);
      const value = toApiValue(field, text);
      const s = String(value);
      if (!DEC_RE.test(s)) return bad('Expects a number, for example 12.5');
      if (!decimalFits(s)) return bad('Up to 14 digits before the point and 4 after it');
      return ok(value, s);
    }
    case 'date':
      return DATE_RE.test(text) && realDate(text) ? ok(toApiValue(field, text)) : bad('Expects a date as YYYY-MM-DD');
    case 'datetime':
      return DATETIME_RE.test(text) && realDate(text) ? ok(toApiValue(field, text)) : bad('Expects a date as YYYY-MM-DD HH:MM');
    case 'email':
      if (!EMAIL_RE.test(text)) return bad('Expects a valid e-mail');
      break;
    case 'url':
      if (!URL_RE.test(text)) return bad('Expects a link starting with http:// or https://');
      break;
  }
  if (field.type === 'long_text') {
    const tooBig = longTextTooBig(text);
    if (tooBig) return bad(tooBig);
  }
  const max = valueMaxLength(String(field.type));
  if (max !== null && text.length > max) return bad(`Admits ${max} characters at most (it has ${text.length})`);
  return ok(toApiValue(field, text));
}

/** The key a unique index compares a value by. */
const uniqueKey = (value: unknown): string => fold(String(value));

/**
 * The whole paste: rows, their problems, and the records ready to send.
 * `existing` = the records already in the list (active and inactive): a value of a
 * unique field that one of them holds cannot be pasted again. The back stays the judge.
 * `header` = the person's own choice about the first line; `null` follows the detection.
 */
export function parseBulk(
  text: string,
  fields: FieldRow[],
  related: Record<string, ListRecord[] | null> = {},
  existing: ListRecord[] = [],
  header: boolean | null = null
): BulkParse {
  const lines = splitPaste(text);
  const match = lines.length ? matchHeader(lines[0], fields) : null;
  const headerSkipped = lines.length > 0 && (header ?? !!match);
  // A header that names fields places the columns by those names (unnamed fields stay empty). Forced
  // on with names that match no field: the line is left out and the columns stay in field order.
  const byName = headerSkipped ? match : null;
  const data = headerSkipped ? lines.slice(1) : lines;
  const columnOf = fields.map((_, f) => (byName ? byName.columns.indexOf(f) : f));
  const width = byName ? byName.columns.length : fields.length;

  const rows: BulkRow[] = data.map((cells, i) => ({
    n: i + 1,
    cells: fields.map((f, k) => readCell(f, columnOf[k] >= 0 ? (cells[columnOf[k]] ?? '') : '', related)),
    problem:
      cells.length <= width
        ? null
        : byName
          ? `This row has ${cells.length} columns; the header has ${width}.`
          : `This row has ${cells.length} columns; the list has ${fields.length} ${fields.length === 1 ? 'field' : 'fields'}.`,
    hasProblem: false
  }));
  const textBytes = data.reduce((sum, cells) => sum + cells.reduce((n, c) => n + utf8Bytes(c), 0), 0);

  // A unique field takes each value once: not one already in the list (inactive records count too),
  // and not twice in the paste (each later copy points at the row that has it first).
  fields.forEach((f, c) => {
    if (!isOn(f.is_unique)) return;
    const stored = new Set<string>();
    for (const record of existing) {
      const v = record[f.code];
      if (v !== null && v !== undefined && v !== '') stored.add(uniqueKey(v));
    }
    const first = new Map<string, number>();
    for (const row of rows) {
      const cell = row.cells[c];
      if (cell.problem || cell.value === null) continue;
      const key = uniqueKey(cell.value);
      if (stored.has(key)) {
        cell.problem = 'Already in the list';
        continue;
      }
      const seen = first.get(key);
      if (seen === undefined) first.set(key, row.n);
      else cell.problem = `Repeated in row ${seen}`;
    }
  });

  for (const row of rows) row.hasProblem = !!row.problem || row.cells.some(c => !!c.problem);
  const withProblems = rows.filter(r => r.hasProblem).length;
  const records = rows
    .filter(r => !r.hasProblem)
    .map(r => {
      const record: Record<string, ApiValue> = {};
      fields.forEach((f, c) => {
        const v = r.cells[c].value;
        if (v !== null) record[f.code] = v;
      });
      return record;
    });

  return {
    rows,
    headerDetected: !!match,
    headerSkipped,
    header: headerSkipped ? (byName && !byName.leading ? 'byName' : 'leading') : null,
    ready: rows.length - withProblems,
    withProblems,
    overLimit: rows.length > MAX_BULK_RECORDS,
    tooMuchText: textBytes > BULK_MAX_TEXT_BYTES,
    records
  };
}

const EXAMPLES: Record<string, string[]> = {
  text: ['Maize', 'Rice', 'Cassava'],
  long_text: ['A cereal grown worldwide', 'A staple grain of Asia', 'A root crop of the tropics'],
  integer: ['12', '2026', '7'],
  decimal: ['3.75', '0.5', '12'],
  boolean: ['yes', 'no', 'yes'],
  date: ['2026-03-15', '2026-04-01', '2026-05-20'],
  datetime: ['2026-03-15 14:30', '2026-04-01 09:00', '2026-05-20 17:45'],
  url: ['https://example.org/maize', 'https://example.org/rice', 'https://example.org/cassava'],
  email: ['maize@example.org', 'rice@example.org', 'cassava@example.org'],
  relation: ['Cereal', 'Root', 'Legume']
};

/** Columns the example shows at most: enough to see the pattern without wrapping. */
const EXAMPLE_COLUMNS = 4;

/** A saved value as a person would paste it back: the option's label, Yes / No, the number, the date. */
function pasteText(field: FieldRow, value: unknown, related: Record<string, ListRecord[] | null>): string {
  if (value === null || value === undefined || value === '') return '';
  if (field.type === 'relation') {
    const id = Number(value);
    const option = (field.relation_code ? related[field.relation_code] : null)?.find(o => o.id === id);
    return option ? recordLabel(option) : String(id);
  }
  if (field.type === 'boolean') return value === true || value === 1 ? 'Yes' : 'No';
  const form = toFormValue(field, value);
  return field.type === 'datetime' ? String(form).replace('T', ' ') : String(form);
}

/**
 * Three example rows, with one column for every field up to the last required
 * one (at least the first, four at most): a list that needs two values must not
 * suggest that one per line is enough. With records in the list, the rows are
 * its first three active records, so every pair is real; else they are made up,
 * and relations use real option names when their list loaded.
 */
export function examplePaste(fields: FieldRow[], related: Record<string, ListRecord[] | null> = {}, existing: ListRecord[] = []): string {
  if (!fields.length) return '';
  let last = 0;
  fields.forEach((f, i) => {
    if (isOn(f.is_required)) last = i;
  });
  const shown = fields.slice(0, Math.min(last + 1, EXAMPLE_COLUMNS));
  const saved = existing.filter(recordIsActive).slice(0, 3);
  if (saved.length) return saved.map(record => shown.map(f => pasteText(f, record[f.code], related)).join('\t')).join('\n');
  const columns = shown.map(f => {
    if (f.type === 'relation') {
      const labels = (activeOptions(f, related) ?? []).map(o => recordLabel(o));
      if (labels.length) return [0, 1, 2].map(i => labels[i % labels.length]);
    }
    return EXAMPLES[String(f.type)] ?? EXAMPLES['text'];
  });
  return [0, 1, 2].map(row => columns.map(values => values[row]).join('\t')).join('\n');
}
