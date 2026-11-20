import { CodeKind, isReservedCode, reservedMessage } from './reserved-codes';

/** The shape the back accepts for a list or field code. */
export const CODE_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;

export const CODE_SHAPE_MESSAGE = 'Use lowercase letters, digits and underscores, starting with a letter (up to 50 characters).';

export function isValidCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/** The right shape and not a word the back keeps for itself. */
export function isUsableCode(code: string, kind: CodeKind): boolean {
  return isValidCode(code) && !isReservedCode(code, kind);
}

/** What is wrong with a code the person wrote, or `''` (an empty code is not ready, not an error). */
export function codeProblem(code: string, kind: CodeKind): string {
  if (code === '') return '';
  if (!isValidCode(code)) return CODE_SHAPE_MESSAGE;
  return isReservedCode(code, kind) ? reservedMessage(code) : '';
}

/**
 * A code proposed from a name: lowercase, accents dropped, every run of
 * non-alphanumerics becomes one `_`, and it starts at the first letter so it
 * can match `CODE_PATTERN`. With a `kind`, a result the back reserves gets a
 * suffix (`date` → `date_field`, `admin` → `admin_list`). It is only a
 * suggestion; the user may edit it.
 */
export function suggestCode(name: string, kind?: CodeKind): string {
  const base = (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .slice(0, 50)
    .replace(/_+$/, '');
  if (!kind || !base || !isReservedCode(base, kind)) return base;
  const suffix = kind === 'field' ? '_field' : '_list';
  return base.slice(0, 50 - suffix.length).replace(/_+$/, '') + suffix;
}
