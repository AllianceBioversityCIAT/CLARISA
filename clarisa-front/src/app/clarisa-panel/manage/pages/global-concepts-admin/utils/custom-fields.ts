import { CustomField, CustomFieldType } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { ListOption, listLabel } from './list-values';

/** The control drawn for each field type. One type, one control; nothing is guessed from the value. */
export type CustomControl = 'text' | 'textarea' | 'chips' | 'dropdown' | 'multiselect' | 'concepts' | 'url' | 'date' | 'number';

const CONTROL: Record<CustomFieldType, CustomControl> = {
  text: 'text',
  long_text: 'textarea',
  multi_text: 'chips',
  list: 'dropdown',
  multi_list: 'multiselect',
  term_link: 'concepts',
  url: 'url',
  date: 'date',
  number: 'number'
};

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Short text',
  long_text: 'Long text',
  multi_text: 'Several texts',
  list: 'One value of a list',
  multi_list: 'Several values of a list',
  term_link: 'Link to other concepts',
  url: 'Web address',
  date: 'Date',
  number: 'Number'
};

export function controlFor(type: CustomFieldType): CustomControl {
  return CONTROL[type] ?? 'text';
}

export function isMultiType(type: CustomFieldType): boolean {
  return type === 'multi_text' || type === 'multi_list' || type === 'term_link';
}

export function needsList(type: CustomFieldType): boolean {
  return type === 'list' || type === 'multi_list';
}

/** The form value of every field: `''` for single values, `[]` for multi, `null` for an empty number. */
export type CustomValue = string | number | null | (string | number)[];

/**
 * Active fields in their `sort` order, each with the value the concept already
 * has, normalised to what its control binds to. `term_link` values stay as
 * term ids (numbers): that is what the back stores and resolves.
 */
export function activeFields(fields: CustomField[]): CustomField[] {
  return [...(fields ?? [])].filter(field => field.is_active).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.label.localeCompare(b.label));
}

export function valuesFromExtra(fields: CustomField[], extra: Record<string, unknown> | null | undefined): Record<string, CustomValue> {
  const out: Record<string, CustomValue> = {};
  for (const field of fields) {
    const raw = extra?.[field.code];
    if (isMultiType(field.type)) {
      const list = Array.isArray(raw) ? raw : raw === undefined || raw === null || raw === '' ? [] : [raw];
      out[field.code] =
        field.type === 'term_link'
          ? list.map(item => Number(typeof item === 'object' && item ? (item as { term_id?: unknown }).term_id : item)).filter(id => id > 0)
          : list.map(item => String(item));
    } else if (field.type === 'number') {
      out[field.code] = raw === undefined || raw === null || raw === '' || isNaN(Number(raw)) ? null : Number(raw);
    } else {
      out[field.code] = raw === undefined || raw === null ? '' : String(raw);
    }
  }
  return out;
}

function isEmpty(value: CustomValue | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return String(value).trim() === '';
}

function normalised(value: CustomValue | undefined): string {
  if (isEmpty(value)) return '';
  if (Array.isArray(value)) return JSON.stringify(value.map(item => (typeof item === 'string' ? item.trim() : item)));
  return typeof value === 'string' ? value.trim() : String(value);
}

function outgoing(value: CustomValue): unknown {
  if (Array.isArray(value)) return value.map(item => (typeof item === 'string' ? item.trim() : item)).filter(item => item !== '');
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * The `extra` of the write. On create only the filled keys travel; on update
 * only the keys whose value changed, and a cleared one as `''` — the back
 * merges, so a key that is not sent keeps its value (contract v2 § 2).
 * Returns `null` when nothing changed, so the body carries no empty `extra`.
 */
export function buildExtra(
  fields: CustomField[],
  values: Record<string, CustomValue>,
  original: Record<string, CustomValue> | null
): Record<string, unknown> | null {
  const extra: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.code];
    if (original) {
      if (normalised(value) === normalised(original[field.code])) continue;
      extra[field.code] = isEmpty(value) ? '' : outgoing(value as CustomValue);
    } else if (!isEmpty(value)) {
      extra[field.code] = outgoing(value as CustomValue);
    }
  }
  return Object.keys(extra).length ? extra : null;
}

/**
 * First problem with the custom values, checked the way the back will: a
 * required field has to be filled on create, and cannot be emptied on update;
 * urls are http(s), dates YYYY-MM-DD, numbers numeric.
 */
export function customFieldsError(
  fields: CustomField[],
  values: Record<string, CustomValue>,
  creating: boolean,
  original: Record<string, CustomValue> | null
): string | null {
  for (const field of fields) {
    const value = values[field.code];
    const touched = creating || normalised(value) !== normalised(original?.[field.code]);
    if (field.required && touched && isEmpty(value)) return `${field.label} is required.`;
    if (isEmpty(value)) continue;
    if (field.type === 'url' && !/^https?:\/\/\S+$/i.test(String(value).trim())) return `${field.label} must start with http:// or https://.`;
    if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) return `${field.label} must be a date (YYYY-MM-DD).`;
    if (field.type === 'number' && isNaN(Number(value))) return `${field.label} must be a number.`;
  }
  return null;
}

/** `Funding source` → `funding_source`: the code a new field proposes from its label. */
export function slugify(label: string): string {
  return (label ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

/**
 * What a table cell shows for one custom field of one concept: list values by
 * their label, linked concepts by their preferred label (the TERM ID when the
 * concept is unknown), several values joined. `''` when the concept has none.
 */
export function customCellText(
  field: CustomField,
  extra: Record<string, unknown> | null | undefined,
  lists: Record<string, ListOption[]>,
  labelOf: (termId: number) => string | undefined
): string {
  const value = valuesFromExtra([field], extra)[field.code];
  if (isEmpty(value)) return '';
  const items = Array.isArray(value) ? value : [value];
  const texts = items.map(item => {
    if (field.type === 'term_link') return labelOf(Number(item)) ?? `TERM ${item}`;
    if (needsList(field.type) && field.list_code) return listLabel(lists, field.list_code, String(item));
    return String(item);
  });
  return texts.join(', ');
}
