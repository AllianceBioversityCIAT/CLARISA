import { FieldRow, ListRecord } from '../models/control-lists.models';

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
