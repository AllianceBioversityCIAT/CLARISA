/**
 * Who a usage row belongs to, as one string: `mis:<id>` for a registered MIS
 * (all its keys together) or `key:<id>` for an API key with no MIS, which is
 * a system of its own since the MIS Registry started its deprecation (Yeck,
 * 2026-09-30). Colors, the Systems picker and the log filter all key on it.
 *
 * The back sends `system_key` since that date; the fallback rebuilds it from
 * `mis_id`/`api_key_id` so an older back still draws (its no-MIS rows, which
 * carry no key id, fold into `key:none`).
 */
export type SystemKey = string;

export const NO_KEY_SYSTEM: SystemKey = 'key:none';

export function systemKeyOf(row: { system_key?: string | null; mis_id?: number | null; api_key_id?: number | null }): SystemKey {
  if (row.system_key) {
    return row.system_key;
  }
  if (row.mis_id != null) {
    return `mis:${row.mis_id}`;
  }
  return row.api_key_id != null ? `key:${row.api_key_id}` : NO_KEY_SYSTEM;
}

/** The system an API key record counts toward: its MIS, or itself. */
export function keyRecordSystemKey(key: { id: number; mis_id?: number | null }): SystemKey {
  return key.mis_id != null ? `mis:${key.mis_id}` : `key:${key.id}`;
}

/**
 * Query params for a selection: MIS ids in `mis_ids`, standalone keys in
 * `key_ids` (the back ORs them). Empty lists are left out. The `key:none`
 * bucket of an older back goes as `mis_ids=0`, which the back reads as «every
 * key with no MIS».
 */
export function systemFilterParams(keys: SystemKey[]): { mis_ids?: string; key_ids?: string } {
  const ids = (prefix: string) =>
    keys
      .filter(k => k.startsWith(prefix))
      .map(k => Number(k.slice(prefix.length)))
      .filter(n => Number.isInteger(n) && n > 0);
  const mis = [...ids('mis:'), ...(keys.includes(NO_KEY_SYSTEM) ? [0] : [])];
  const key = ids('key:');
  return {
    ...(mis.length ? { mis_ids: mis.join(',') } : {}),
    ...(key.length ? { key_ids: key.join(',') } : {})
  };
}
