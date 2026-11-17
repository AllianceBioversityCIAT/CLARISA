import { BadRequestException } from '@nestjs/common';

/**
 * Field types an administrator can choose. Closed on purpose: the SQL type of
 * a column only ever comes from this table, never from the request.
 */
export const FIELD_TYPES = {
  text: { sql: 'VARCHAR(255)', label: 'Short text' },
  long_text: { sql: 'TEXT', label: 'Long text' },
  integer: { sql: 'BIGINT', label: 'Whole number' },
  decimal: { sql: 'DECIMAL(18,4)', label: 'Decimal number' },
  boolean: { sql: 'TINYINT(1)', label: 'Yes / No' },
  date: { sql: 'DATE', label: 'Date' },
  datetime: { sql: 'DATETIME', label: 'Date and time' },
  url: { sql: 'VARCHAR(500)', label: 'Link' },
  email: { sql: 'VARCHAR(255)', label: 'E-mail' },
  relation: { sql: 'BIGINT', label: 'Relation to another list' },
} as const;

export type FieldType = keyof typeof FIELD_TYPES;

/** Own keys only: `constructor` or `__proto__` are not field types. */
export function isFieldType(t: unknown): t is FieldType {
  return (
    typeof t === 'string' &&
    Object.prototype.hasOwnProperty.call(FIELD_TYPES, t)
  );
}

/** Longest value each text type holds. */
export const TEXT_MAX: Partial<Record<FieldType, number>> = {
  text: 255,
  email: 255,
  url: 500,
  long_text: 65_000,
};

/** Same rule as the MELIAF custom fields (`global-concepts/utils/custom-fields.ts`). */
const CODE_RE = /^[a-z][a-z0-9_]{0,49}$/;

/** Columns the engine owns; no field may take these names. */
export const SYSTEM_COLUMNS = new Set([
  'id',
  'created_at',
  'updated_at',
  'is_active',
  'created_by',
  'updated_by',
  'modification_justification',
  'request_id',
]);

/**
 * MySQL words that slip in most as field names, plus the query parameters of
 * the public endpoint: a field called `show` or `expand` could never be used
 * as a filter.
 */
const RESERVED = new Set([
  'select',
  'insert',
  'update',
  'delete',
  'from',
  'where',
  'table',
  'index',
  'key',
  'order',
  'group',
  'by',
  'join',
  'left',
  'right',
  'inner',
  'outer',
  'union',
  'create',
  'drop',
  'alter',
  'add',
  'column',
  'primary',
  'foreign',
  'references',
  'default',
  'null',
  'not',
  'and',
  'or',
  'like',
  'in',
  'is',
  'between',
  'case',
  'when',
  'then',
  'else',
  'end',
  'as',
  'on',
  'using',
  'desc',
  'asc',
  'limit',
  'offset',
  'having',
  'distinct',
  'values',
  'set',
  'int',
  'integer',
  'varchar',
  'text',
  'date',
  'datetime',
  'timestamp',
  'rank',
  'row',
  'rows',
  'lead',
  'lag',
  'window',
  'over',
  'partition',
  'show',
  'fields',
  'expand',
  'dir',
  // Read by CLARISA's version extractor on every route (src/main.ts).
  'version',
]);

/**
 * List codes that would shadow a route of the module, or whose table
 * (`cl_<code>`) is one of the catalog's own tables.
 */
const RESERVED_LIST_CODES = new Set([
  'admin',
  'get',
  'lists',
  'fields',
  'schema_ops',
]);

export function assertListCode(code: unknown): asserts code is string {
  assertCode(code, 'list code');
  if (RESERVED_LIST_CODES.has(code as string)) {
    throw new BadRequestException(
      `"${code}" is used by the platform. Choose another list code.`,
    );
  }
}

export function assertFieldCode(code: unknown): asserts code is string {
  assertCode(code, 'field code');
  if (SYSTEM_COLUMNS.has(code as string)) {
    throw new BadRequestException(
      `"${code}" is managed by the system. Choose another field code.`,
    );
  }
}

function assertCode(code: unknown, what: string): void {
  if (typeof code !== 'string' || !CODE_RE.test(code)) {
    throw new BadRequestException(
      `The ${what} "${String(code)}" is not valid: it must start with a lowercase letter and use only lowercase letters, numbers and underscores (50 at most).`,
    );
  }
  if (RESERVED.has(code)) {
    throw new BadRequestException(
      `"${code}" is a reserved word. Choose another name, for example "${code}_1".`,
    );
  }
}

/** TEXT cannot be indexed without a prefix length: refused before MySQL sees it. */
export function assertIndexable(f: {
  type: FieldType;
  is_unique?: unknown;
  is_indexed?: unknown;
  label?: string;
}): void {
  if (f.type === 'long_text' && (f.is_unique || f.is_indexed)) {
    throw new BadRequestException(
      `"${f.label ?? 'The field'}" is long text: it cannot be unique or filterable. Use short text if you need to search by it.`,
    );
  }
}

const INT_RE = /^-?\d+$/;
const DEC_RE = /^-?\d+(\.\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const URL_RE = /^https?:\/\/\S+$/i;

/** A calendar date and time that exists: JS rolls 2026-02-30 over to March. */
function realDate(s: string): boolean {
  const m =
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
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

/**
 * DECIMAL(18,4) holds 18 digits; a JSON number keeps about 15. Values are
 * capped at 15 significant digits so what the API answers is exactly what
 * was stored (review 2026-11-17: 12345678901234.5678 came back changed).
 */
const DECIMAL_MAX_DIGITS = 15;

function decimalFits(s: string): boolean {
  if (!DEC_RE.test(s)) return false;
  const [int, frac = ''] = s.replace('-', '').split('.');
  const intDigits = int.replace(/^0+/, '');
  const fracDigits = frac.replace(/0+$/, '');
  return (
    intDigits.length <= 14 &&
    fracDigits.length <= 4 &&
    intDigits.length + fracDigits.length <= DECIMAL_MAX_DIGITS
  );
}

/** Canonical text of a whole number: no leading zeros, no plus sign. */
const CANON_INT_RE = /^-?(0|[1-9]\d*)$/;
/** Canonical text of a decimal: no leading zeros. */
const CANON_DEC_RE = /^-?(0|[1-9]\d*)(\.\d+)?$/;
const TEXT_TYPES = new Set<FieldType>(['text', 'long_text', 'email', 'url']);

/**
 * A value received from a client, converted to what the column stores.
 * `null` for empty. Used for record writes and for the public filters, so
 * `?active=true` and `?age=abc` are judged by the field type instead of being
 * handed to MySQL as text (review 2026-11-13, defect A: MySQL turns a
 * non-numeric string into 0 and the filter answered the opposite).
 */
export function coerceValue(
  type: FieldType,
  raw: unknown,
  label: string,
): string | number | null {
  // Blank is empty: a cell of spaces must not become 0 or a 1-space name.
  if (
    raw === undefined ||
    raw === null ||
    (typeof raw === 'string' && raw.trim() === '')
  ) {
    return null;
  }
  if (typeof raw === 'object') {
    throw new BadRequestException(`"${label}" expects a single value.`);
  }
  const s = String(raw).trim();
  switch (type) {
    case 'integer':
    case 'relation': {
      if (!INT_RE.test(s)) {
        throw new BadRequestException(`"${label}" expects a whole number.`);
      }
      const n = Number(s);
      if (!Number.isSafeInteger(n)) {
        throw new BadRequestException(`"${label}": that number is too large.`);
      }
      return n;
    }
    case 'decimal': {
      if (!DEC_RE.test(s)) {
        throw new BadRequestException(
          `"${label}" expects a number, for example 12.5`,
        );
      }
      if (!decimalFits(s)) {
        throw new BadRequestException(
          `"${label}" admits up to 14 digits before the decimal point, 4 after it and ${DECIMAL_MAX_DIGITS} in total.`,
        );
      }
      // The validated text, not a JS number: MySQL converts it exactly.
      return s;
    }
    case 'boolean': {
      const v = s.toLowerCase();
      if (raw === true || v === 'true' || v === '1') return 1;
      if (raw === false || v === 'false' || v === '0') return 0;
      throw new BadRequestException(`"${label}" expects true or false.`);
    }
    case 'date':
    case 'datetime': {
      const ok =
        (type === 'date' ? DATE_RE.test(s) : DATETIME_RE.test(s)) &&
        realDate(s);
      if (!ok) {
        throw new BadRequestException(
          `"${label}" expects a date as ${type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:MM'}.`,
        );
      }
      return s.replace('T', ' ');
    }
    case 'email':
      if (!EMAIL_RE.test(s)) {
        throw new BadRequestException(`"${label}" expects a valid e-mail.`);
      }
      return assertLength(type, s, label);
    case 'url':
      if (!URL_RE.test(s)) {
        throw new BadRequestException(
          `"${label}" expects a link starting with http:// or https://.`,
        );
      }
      return assertLength(type, s, label);
    default:
      return assertLength(type, String(raw), label);
  }
}

function assertLength(type: FieldType, value: string, label: string): string {
  const max = TEXT_MAX[type] ?? 255;
  if (value.length > max) {
    throw new BadRequestException(
      `"${label}" admits ${max} characters at most (it has ${value.length}).`,
    );
  }
  return value;
}

/**
 * Whether a stored value (as `CAST(col AS CHAR)` returns it) would change, or
 * stop fitting, if the column became `to`. Rounding, cutting the time off a
 * date or a value MySQL cannot convert all count: the administrator is told
 * how many records before the change runs (review 2026-11-13, defect I:
 * 12.5 became 13 and a datetime lost its time, both with HTTP 200).
 */
export function valueChangesOnRetype(
  to: FieldType,
  stored: string,
  from?: FieldType,
): boolean {
  const s = stored;
  // Text is kept as typed: "007" or "+5" would come back as 7 and 5, so for
  // a text source only the canonical form keeps its value.
  if (from && TEXT_TYPES.has(from)) {
    if (to === 'integer' && !CANON_INT_RE.test(s)) return true;
    if (to === 'decimal' && !CANON_DEC_RE.test(s)) return true;
    if (to === 'boolean' && s !== '0' && s !== '1') return true;
    if (to === 'date' && !DATE_RE.test(s)) return true;
    if (
      to === 'datetime' &&
      !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)
    ) {
      return true;
    }
  }
  switch (to) {
    case 'long_text':
      return s.length > TEXT_MAX.long_text;
    case 'text':
      return s.length > TEXT_MAX.text;
    case 'email':
      return s.length > TEXT_MAX.email || !EMAIL_RE.test(s);
    case 'url':
      return s.length > TEXT_MAX.url || !URL_RE.test(s);
    case 'integer': {
      if (INT_RE.test(s)) return !Number.isSafeInteger(Number(s));
      return !/^-?\d+\.0+$/.test(s); // 12.0000 → 12 keeps the value
    }
    case 'decimal':
      return !decimalFits(s);
    case 'boolean':
      return !/^[01](\.0+)?$/.test(s);
    case 'date':
      if (DATE_RE.test(s)) return !realDate(s);
      return !(/^\d{4}-\d{2}-\d{2} 00:00(:00)?$/.test(s) && realDate(s));
    case 'datetime':
      return !(
        (DATE_RE.test(s) ||
          /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) &&
        realDate(s)
      );
    default:
      return true;
  }
}

/** One value as the public contract answers it. */
export function formatValue(type: FieldType, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  switch (type) {
    case 'boolean':
      return Number(value) === 1;
    case 'integer':
    case 'relation':
    case 'decimal': {
      const n = Number(value);
      return Number.isFinite(n) ? n : value;
    }
    default:
      return value;
  }
}
