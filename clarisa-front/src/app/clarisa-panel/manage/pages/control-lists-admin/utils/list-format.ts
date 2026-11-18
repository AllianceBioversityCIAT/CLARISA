import { FieldRow, ListRow, OwnerRole } from '../models/control-lists.models';
import { isOn } from './record-values';

export function ownerLabel(owners: OwnerRole[], id: number): string {
  return owners.find(o => o.id === id)?.acronym ?? `Role #${id}`;
}

export function relationCount(fields: FieldRow[]): number {
  return fields.filter(f => f.type === 'relation').length;
}

export const statusLabel = (list: Pick<ListRow, 'status'>): string => (list.status === 'published' ? 'Published' : 'Draft');

/** Fields that can filter the public address (the back answers 400 for the rest). */
export function filterableFields(fields: FieldRow[]): FieldRow[] {
  return fields.filter(f => isOn(f.is_indexed) || isOn(f.is_unique) || f.type === 'relation');
}

/** Published lists of the same owner that a relation field of `list` may point to. */
export function relationTargets(lists: ListRow[], list: Pick<ListRow, 'id' | 'owner_role_id'>): ListRow[] {
  return lists.filter(l => l.status === 'published' && l.owner_role_id === list.owner_role_id && l.id !== list.id);
}

/**
 * `YYYY-MM-DD` of a timestamp in the viewer's time zone, or `—`; a bad value
 * must never break the table (the date pipe throws). Slicing the ISO text gave
 * the UTC day: tomorrow's date for anything saved in the evening in Colombia.
 */
export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const plain = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  if (plain) return plain[0];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}
