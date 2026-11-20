import { FieldRow, ListRecord } from '../models/control-lists.models';
import { LONG_TEXT_MAX_BYTES } from './limits';

/**
 * Form value of one field, by type:
 * - text, long_text, url, email, integer, decimal, date, datetime → string (`''` = empty)
 * - boolean → `boolean` when the field is required, else `'yes' | 'no' | ''`
 * - relation → record id or `null`
 */
export type FormValue = string | boolean | number | null;
export type FormValues = Record<string, FormValue>;

export const isOn = (flag: 0 | 1 | boolean | null | undefined): boolean => flag === true || flag === 1;

/** The fields a record can hold: only the published ones, in position order. */
export function publishedFields(fields: FieldRow[]): FieldRow[] {
  return fields.filter(f => f.status === 'published').sort((a, b) => a.position - b.position);
}

const isEmpty = (v: unknown): boolean => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/** Bytes of a text once encoded as UTF-8 (what MySQL counts), without `TextEncoder`. */
export function utf8Bytes(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/** `12,000` or `1,234`: thousands with a comma, or a decimal comma? Too close to call. `2,9` and `12,50` are decimal commas. */
const AMBIGUOUS_RE = /^(-?)(\d{1,3})((?:,\d{3})+)$/;

/** Why a decimal written with a comma cannot be read safely, or `null`. Both examples come from the typed digits. */
export function ambiguousNumber(text: string): string | null {
  const m = AMBIGUOUS_RE.exec(text.trim());
  if (!m) return null;
  const [, sign, head, groups] = m;
  const whole = `${sign}${head}${groups.replace(/,/g, '')}`;
  const fraction = groups.replace(/,/g, '').replace(/0+$/, '') || '0';
  const decimal = `${sign}${head}.${fraction}`;
  return `Ambiguous number: write ${whole} if the comma separates thousands, or ${decimal} if it is the decimal point.`;
}

export function longTextTooBig(text: string): string | null {
  const bytes = utf8Bytes(text);
  return bytes > LONG_TEXT_MAX_BYTES
    ? `Too long: this text needs ${bytes.toLocaleString('en-US')} bytes of the ${LONG_TEXT_MAX_BYTES.toLocaleString('en-US')} a long text holds.`
    : null;
}

/** What the form must not send as it is: an ambiguous decimal, a long text over its bytes. `null` when it can go. */
export function valueProblem(field: FieldRow, value: FormValue | undefined): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  if (field.type === 'decimal') return ambiguousNumber(value);
  if (field.type === 'long_text') return longTextTooBig(value);
  return null;
}

/** API value → what the form control holds. */
export function toFormValue(field: FieldRow, apiValue: unknown): FormValue {
  switch (field.type) {
    case 'boolean':
      if (isOn(field.is_required)) return apiValue === true || apiValue === 1;
      return apiValue === true || apiValue === 1 ? 'yes' : apiValue === false || apiValue === 0 ? 'no' : '';
    case 'relation': {
      const n = typeof apiValue === 'string' ? Number(apiValue) : apiValue;
      return typeof n === 'number' && Number.isFinite(n) ? n : null;
    }
    case 'date':
      return isEmpty(apiValue) ? '' : String(apiValue).slice(0, 10);
    case 'datetime': {
      if (isEmpty(apiValue)) return '';
      // `YYYY-MM-DD HH:MM:SS` → `YYYY-MM-DDTHH:MM`; the seconds stay only when they are not `:00`.
      const local = String(apiValue).trim().replace(' ', 'T');
      return /^.{16}:00$/.test(local) ? local.slice(0, 16) : local.slice(0, 19);
    }
    default:
      return isEmpty(apiValue) && apiValue !== 0 ? '' : String(apiValue);
  }
}

/** The value a blank form control starts with on «New record». */
export function emptyFormValue(field: FieldRow): FormValue {
  if (field.type === 'boolean') return isOn(field.is_required) ? false : '';
  return field.type === 'relation' ? null : '';
}

export function initialValues(fields: FieldRow[], record?: ListRecord): FormValues {
  const values: FormValues = {};
  for (const f of fields) values[f.code] = record ? toFormValue(f, record[f.code]) : emptyFormValue(f);
  return values;
}

/** Form control value → what goes on the wire; `null` = empty. */
export function toApiValue(field: FieldRow, value: FormValue | undefined): string | number | boolean | null {
  switch (field.type) {
    case 'boolean':
      if (typeof value === 'boolean') return value;
      return value === 'yes' ? true : value === 'no' ? false : null;
    case 'relation': {
      const n = typeof value === 'string' ? Number(value) : value;
      return typeof n === 'number' && Number.isFinite(n) ? n : null;
    }
    case 'integer':
    case 'decimal': {
      if (isEmpty(value)) return null;
      const typed = String(value).trim();
      // «12,000» could be twelve thousand or twelve: it is never converted (the form refuses it first).
      if (field.type === 'decimal' && AMBIGUOUS_RE.test(typed)) return typed;
      // «3,5» is how many people write a decimal: the back reads the point only.
      const raw = field.type === 'decimal' && /^-?\d+,\d+$/.test(typed) ? typed.replace(',', '.') : typed;
      const pattern = field.type === 'integer' ? /^-?\d+$/ : /^-?\d+(\.\d+)?$/;
      // Anything that is not a plain number goes as typed, so the back says why.
      if (!pattern.test(raw)) return raw;
      const n = Number(raw);
      const digits = raw.replace(/[-.]/g, '').replace(/^0+(?=\d)/, '').length;
      return Number.isFinite(n) && digits <= 15 ? n : raw;
    }
    case 'date':
      return isEmpty(value) ? null : String(value).trim();
    case 'datetime': {
      if (isEmpty(value)) return null;
      const spaced = String(value).trim().replace('T', ' ');
      return spaced.length === 16 ? `${spaced}:00` : spaced;
    }
    default:
      return isEmpty(value) ? null : String(value);
  }
}

/** A required field with no value (empty text, no option chosen); a switch always has one. */
export function isMissing(field: FieldRow, value: FormValue | undefined): boolean {
  return isOn(field.is_required) && toApiValue(field, value) === null;
}

/** «New record» body: empty values are left out, `false` and `0` are kept. */
export function buildCreateBody(fields: FieldRow[], values: FormValues): Record<string, string | number | boolean> {
  const body: Record<string, string | number | boolean> = {};
  for (const f of fields) {
    const v = toApiValue(f, values[f.code]);
    if (v !== null) body[f.code] = v;
  }
  return body;
}

/** «Edit» body: only what the user changed; a cleared field goes as `null`. */
export function buildChangedBody(fields: FieldRow[], initial: FormValues, current: FormValues): Record<string, string | number | boolean | null> {
  const body: Record<string, string | number | boolean | null> = {};
  for (const f of fields) {
    if (initial[f.code] !== current[f.code]) body[f.code] = toApiValue(f, current[f.code]);
  }
  return body;
}

/**
 * The label of a related record in a dropdown or a cell: its first text
 * property that is not `id` / `is_active`, else `#<id>`.
 */
export function recordLabel(record: ListRecord | null | undefined, fallbackId?: number | null): string {
  if (record) {
    for (const key of Object.keys(record)) {
      if (key === 'id' || key === 'is_active') continue;
      const v = record[key];
      if (typeof v === 'string' && v.trim()) return v;
    }
    return `#${record.id}`;
  }
  return fallbackId === null || fallbackId === undefined ? '—' : `#${fallbackId}`;
}

export const recordIsActive = (r: ListRecord): boolean => r.is_active === true || r.is_active === 1;
