import { BadRequestException } from '@nestjs/common';
import { GcConcept } from '../entities/gc-concept.entity';
import { GcField, GcFieldType } from '../entities/gc-field.entity';

/**
 * Keys of `gc_concepts.extra` that are not custom fields. `extra` predates
 * custom fields (D15) and is the module's free-form bag, so a field code may
 * never take one of these names: `deprecation_reason` is reserved for the
 * deprecation note, and anything starting with `_` for internal use.
 */
export const RESERVED_EXTRA_KEYS = ['deprecation_reason'];
export const isReservedExtraKey = (k: string) =>
  k.startsWith('_') || RESERVED_EXTRA_KEYS.includes(k);

/** Lower-case slug starting with a letter: it is a JSON key and a CSV header (`x:<code>`). */
export const FIELD_CODE = /^[a-z][a-z0-9_]{0,49}$/;

/** The types whose value is a list; an import cell splits on `;` or `|` for them. */
export const MULTI_FIELD_TYPES = [
  GcFieldType.MULTI_TEXT,
  GcFieldType.MULTI_LIST,
  GcFieldType.TERM_LINK,
];

/** Prefix of a custom field in import rows and CSV headers. */
export const CUSTOM_COLUMN_PREFIX = 'x:';

const MAX_TEXT = 1000;
const MAX_LONG_TEXT = 20000;
const MAX_ITEMS = 100;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const norm = (v: string) => v.replace(/\s+/g, ' ').trim();
const key = (v: string) => norm(v).toLowerCase();

/** `''`, `null` and `[]` (also a list of blanks) all mean "clear this key". */
const isEmpty = (v: unknown) =>
  v === null ||
  v === undefined ||
  (typeof v === 'string' && !v.trim()) ||
  (Array.isArray(v) &&
    v.every(
      (x) =>
        x === null || x === undefined || (typeof x === 'string' && !x.trim()),
    ));

export const isHttpUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const isRealDay = (v: string) => {
  if (!DAY.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

export interface ExtraContext {
  /** Active field definitions of the scheme. */
  fields: GcField[];
  /** Active list values by list code (value or label → value), as `loadLists`. */
  lists: Map<string, Map<string, string>>;
  /** Concepts of the same scheme by term_id, for `term_link` values. */
  concepts: Map<number, GcConcept>;
}

/** Term ids referenced by the `term_link` values of a payload, before any check. */
export function termLinkIds(
  fields: GcField[],
  incoming: Record<string, unknown> | undefined,
): number[] {
  if (!incoming) return [];
  const out = new Set<number>();
  for (const f of fields) {
    if (f.type !== GcFieldType.TERM_LINK) continue;
    const v = incoming[f.code];
    for (const x of Array.isArray(v) ? v : [v]) {
      const n = Number(x);
      if (Number.isInteger(n) && n > 0) out.add(n);
    }
  }
  return [...out];
}

/**
 * Validates `incoming` against the active field definitions and merges it
 * into `current` (contract v2 §2). Keys not sent are kept — the stored
 * object is never replaced — so a form that only knows some fields cannot
 * wipe the others, and reserved keys (`deprecation_reason`, `_…`) survive
 * every save. Returns the new object, or `current` untouched when nothing
 * was sent and nothing is required.
 *
 * `creating`: every required active field must end up with a value. On an
 * update, `required` only bites when the key is sent (clearing it).
 */
export function mergeExtra(
  ctx: ExtraContext,
  current: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | undefined,
  creating: boolean,
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...(current ?? {}) };
  if (
    incoming !== undefined &&
    (incoming === null ||
      typeof incoming !== 'object' ||
      Array.isArray(incoming))
  ) {
    throw new BadRequestException(
      'extra must be an object keyed by field code',
    );
  }
  const byCode = new Map(ctx.fields.map((f) => [f.code, f]));
  const unknown = Object.keys(incoming ?? {}).filter((k) => !byCode.has(k));
  if (unknown.length) {
    throw new BadRequestException(
      `Unknown custom field(s): ${unknown.join(', ')}`,
    );
  }
  for (const [code, raw] of Object.entries(incoming ?? {})) {
    const field = byCode.get(code) as GcField;
    if (isEmpty(raw)) {
      if (field.required) {
        throw new BadRequestException(
          `${field.label} (${code}) is required and cannot be emptied`,
        );
      }
      delete base[code];
      continue;
    }
    base[code] = cleanValue(ctx, field, raw);
  }
  if (creating) {
    const missing = ctx.fields.filter(
      (f) => f.required && isEmpty(base[f.code]),
    );
    if (missing.length) {
      throw new BadRequestException(
        `Required custom field(s) missing: ${missing.map((f) => f.code).join(', ')}`,
      );
    }
  }
  return base;
}

/** One value, checked and normalised for its field type. */
function cleanValue(ctx: ExtraContext, field: GcField, raw: unknown): unknown {
  const bad = (why: string) =>
    new BadRequestException(`${field.label} (${field.code}): ${why}`);
  const text = (v: unknown, max: number, keepLines = false) => {
    if (typeof v !== 'string' && typeof v !== 'number')
      throw bad('expects text');
    const t = keepLines ? String(v).trim() : norm(String(v));
    if (t.length > max) throw bad(`is limited to ${max} characters`);
    return t;
  };
  const many = (v: unknown) => {
    const items = (Array.isArray(v) ? v : [v]).filter((x) => !isEmpty(x));
    if (items.length > MAX_ITEMS)
      throw bad(`accepts up to ${MAX_ITEMS} values`);
    return items;
  };
  const fromList = (v: unknown) => {
    const list = ctx.lists.get(field.list_code ?? '');
    const value =
      typeof v === 'string' || typeof v === 'number'
        ? list?.get(key(String(v)))
        : undefined;
    if (!value)
      throw bad(
        `"${String(v)}" is not an active value of the ${field.list_code} list`,
      );
    return value;
  };

  switch (field.type) {
    case GcFieldType.TEXT:
      if (Array.isArray(raw)) throw bad('expects one text');
      return text(raw, MAX_TEXT);
    case GcFieldType.LONG_TEXT:
      if (Array.isArray(raw)) throw bad('expects one text');
      return text(raw, MAX_LONG_TEXT, true);
    case GcFieldType.MULTI_TEXT:
      return [...new Set(many(raw).map((v) => text(v, MAX_TEXT)))];
    case GcFieldType.LIST:
      if (Array.isArray(raw)) throw bad('expects one value');
      return fromList(raw);
    case GcFieldType.MULTI_LIST:
      return [...new Set(many(raw).map(fromList))];
    case GcFieldType.TERM_LINK: {
      const ids = many(raw).map((v) => {
        const n = typeof v === 'string' ? Number(v.trim()) : Number(v);
        if (typeof v === 'boolean' || !Number.isInteger(n) || n < 1)
          throw bad(`"${String(v)}" is not a term_id`);
        return n;
      });
      const unknownIds = ids.filter((n) => !ctx.concepts.has(n));
      if (unknownIds.length)
        throw bad(
          `no concept with term_id ${unknownIds.join(', ')} in this scheme`,
        );
      return [...new Set(ids)];
    }
    case GcFieldType.URL: {
      const t = text(raw, MAX_TEXT);
      if (!isHttpUrl(t)) throw bad('expects an http(s) URL');
      return t;
    }
    case GcFieldType.DATE: {
      const t = text(raw, 10);
      if (!isRealDay(t)) throw bad('expects a date as YYYY-MM-DD');
      return t;
    }
    case GcFieldType.NUMBER: {
      const n = typeof raw === 'string' ? Number(raw.trim()) : raw;
      if (typeof n !== 'number' || !Number.isFinite(n))
        throw bad('expects a number');
      return n;
    }
  }
  throw bad(`has an unknown type "${field.type}"`);
}

/** A custom field as published: only active + public fields, in `sort` order. */
export interface PublicCustomField {
  code: string;
  label: string;
  type: GcFieldType;
  value: unknown;
}

export const sortFields = (fields: GcField[]) =>
  [...fields].sort(
    (a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.code.localeCompare(b.code),
  );

/** The public definitions of a scheme's fields: active and public. */
export const publicFields = (fields: GcField[] | undefined) =>
  sortFields((fields ?? []).filter((f) => !!f.is_active && !!f.is_public));
