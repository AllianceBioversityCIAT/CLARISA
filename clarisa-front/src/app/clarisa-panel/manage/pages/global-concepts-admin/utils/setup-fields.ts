import { CustomField, CustomFieldInput, CustomFieldPatch, CustomFieldType } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { needsList, slugify } from './custom-fields';

export interface FieldForm {
  id: number | null;
  code: string;
  label: string;
  type: CustomFieldType;
  list_code: string | null;
  required: boolean;
  is_public: boolean;
  sort: number | null;
  help: string;
  is_active: boolean;
}

export function emptyFieldForm(nextSort = 0): FieldForm {
  return { id: null, code: '', label: '', type: 'text', list_code: null, required: false, is_public: true, sort: nextSort, help: '', is_active: true };
}

export function fieldFormFrom(field: CustomField): FieldForm {
  return {
    id: field.id,
    code: field.code,
    label: field.label ?? '',
    type: field.type,
    list_code: field.list_code ?? null,
    required: !!field.required,
    is_public: !!field.is_public,
    sort: field.sort ?? 0,
    help: field.help ?? '',
    is_active: !!field.is_active
  };
}

/**
 * Code and type are fixed once the field exists: every stored value is keyed
 * by the code and was validated against the type (contract v2 § 2). The form
 * shows them read-only and the PATCH never carries them.
 */
export function isLocked(form: FieldForm, key: 'code' | 'type' | 'list_code'): boolean {
  return form.id !== null && (key === 'code' || key === 'type' || key === 'list_code');
}

export function fieldFormError(form: FieldForm, existing: CustomField[]): string | null {
  if (!form.label.trim()) return 'The label is required.';
  if (form.id === null) {
    const code = form.code.trim();
    if (!code) return 'The code is required.';
    if (!/^[a-z][a-z0-9_]{0,49}$/.test(code)) return 'The code is lower-case letters, digits and _, starting with a letter.';
    if (existing.some(field => field.code === code)) return `“${code}” is already the code of another field.`;
    if (needsList(form.type) && !form.list_code) return 'Pick the controlled list the values come from.';
  }
  if (form.sort !== null && !Number.isInteger(Number(form.sort))) return 'The order is a whole number.';
  return null;
}

export function fieldCreateBody(form: FieldForm): CustomFieldInput {
  const body: CustomFieldInput = {
    code: form.code.trim(),
    label: form.label.trim(),
    type: form.type,
    required: form.required,
    is_public: form.is_public
  };
  if (needsList(form.type) && form.list_code) body.list_code = form.list_code;
  if (form.sort !== null) body.sort = Number(form.sort);
  if (form.help.trim()) body.help = form.help.trim();
  return body;
}

export function fieldPatchBody(form: FieldForm, original: FieldForm): CustomFieldPatch {
  const body: CustomFieldPatch = {};
  if (form.label.trim() !== original.label.trim()) body.label = form.label.trim();
  if (form.help.trim() !== original.help.trim()) body.help = form.help.trim();
  if (form.required !== original.required) body.required = form.required;
  if (form.is_public !== original.is_public) body.is_public = form.is_public;
  if (form.is_active !== original.is_active) body.is_active = form.is_active;
  if (form.sort !== null && Number(form.sort) !== Number(original.sort)) body.sort = Number(form.sort);
  return body;
}

/** While the code has not been typed by hand, it follows the label. */
export function suggestCode(label: string): string {
  const slug = slugify(label);
  return /^[a-z]/.test(slug) ? slug : slug ? `f_${slug}`.slice(0, 50) : '';
}

// ------------------------------------------------------------- controlled lists

export interface ListGroup<T extends { list_code: string; sort: number; label: string; is_active: boolean }> {
  code: string;
  values: T[];
  active: number;
}

/** Values grouped by list code, each group in its stored order. */
export function groupListValues<T extends { list_code: string; sort: number; label: string; is_active: boolean }>(values: T[]): ListGroup<T>[] {
  const byCode = new Map<string, T[]>();
  for (const value of values ?? []) byCode.set(value.list_code, [...(byCode.get(value.list_code) ?? []), value]);
  return [...byCode.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, list]) => {
      const sorted = [...list].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.label.localeCompare(b.label));
      return { code, values: sorted, active: sorted.filter(value => value.is_active).length };
    });
}

/**
 * The `sort` each value must get after moving `index` by `delta`: positions
 * are renumbered 0..n-1 so ties left by old data resolve too. Only the values
 * whose sort changes are returned — those are the PATCHes to send.
 */
export function reorderPatches<T extends { id: number; sort: number }>(values: T[], index: number, delta: -1 | 1): { id: number; sort: number }[] {
  const target = index + delta;
  if (index < 0 || index >= values.length || target < 0 || target >= values.length) return [];
  const order = [...values];
  [order[index], order[target]] = [order[target], order[index]];
  return order.map((value, position) => ({ id: value.id, sort: position, before: value.sort })).filter(item => item.sort !== item.before).map(({ id, sort }) => ({ id, sort }));
}
