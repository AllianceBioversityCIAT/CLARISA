import { ListValue } from '../../../../../shared/services/global-concepts/global-concepts-api.service';

export interface ListOption {
  label: string;
  value: string;
}

/**
 * Groups the controlled lists by `list_code`. The typed client declares an
 * array of `{list_code, value, label}`, while the back's `lists()` answers an
 * object keyed by list code (`{ term_type: [{value, label}] }`); both shapes
 * are accepted so the form works whichever one arrives.
 */
export function groupLists(response: unknown): Record<string, ListOption[]> {
  const out: Record<string, ListOption[]> = {};
  const push = (code: string, item: { value?: unknown; label?: unknown }) => {
    if (!code || item?.value === undefined || item?.value === null) return;
    const value = String(item.value);
    (out[code] ??= []).push({ value, label: item.label ? String(item.label) : value });
  };

  if (Array.isArray(response)) {
    [...(response as ListValue[])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).forEach(item => push(item?.list_code, item));
  } else if (response && typeof response === 'object') {
    for (const [code, items] of Object.entries(response as Record<string, unknown>)) {
      if (Array.isArray(items)) items.forEach(item => push(code, item));
    }
  }

  return out;
}

/** Label of a stored list value, falling back to the raw value. */
export function listLabel(lists: Record<string, ListOption[]>, code: string, value: string | null | undefined): string {
  if (!value) return '';
  return lists[code]?.find(option => option.value === value)?.label ?? value;
}
