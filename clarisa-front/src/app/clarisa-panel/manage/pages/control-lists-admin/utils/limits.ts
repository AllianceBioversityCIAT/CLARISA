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
