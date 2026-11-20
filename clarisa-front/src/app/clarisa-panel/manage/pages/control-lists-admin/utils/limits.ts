/**
 * The longest values the back accepts, so a box can stop typing at the limit
 * instead of failing at the server. Sources, in the control-lists engine
 * (`clarisa-back/src/api/control-lists/`):
 * - `lists.service.ts` → `MAX` (list name, description, field label)
 * - `engine/field-types.ts` → `CODE_RE` (50 characters) and `TEXT_MAX`
 */
export const LIMITS = {
  listName: 150,
  description: 500,
  fieldLabel: 150,
  code: 50
} as const;

/** Longest value of each text type of a record (`TEXT_MAX` of the back). */
const TEXT_MAX: Record<string, number> = {
  text: 255,
  email: 255,
  url: 500,
  long_text: 65_000
};

/** `null` for the types the back does not cap by length (numbers, dates, options). */
export function valueMaxLength(type: string): number | null {
  return TEXT_MAX[type] ?? null;
}

/** Most records «Add several» sends in one request (`LIMITS.recordsPerBulk` of the back). */
export const MAX_BULK_RECORDS = 500;

/** A long text (MySQL TEXT) holds 65,535 bytes of UTF-8, whatever its number of characters. */
export const LONG_TEXT_MAX_BYTES = 65_535;

/** The texts of one «Add several» request together (the back's body limit). */
export const BULK_MAX_TEXT_BYTES = 2_000_000;
