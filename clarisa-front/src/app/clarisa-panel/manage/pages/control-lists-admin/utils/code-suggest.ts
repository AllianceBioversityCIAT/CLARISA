/** The shape the back accepts for a list or field code. */
export const CODE_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;

export function isValidCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/**
 * A code proposed from a name: lowercase, accents dropped, every run of
 * non-alphanumerics becomes one `_`, and it starts at the first letter so it
 * can match `CODE_PATTERN`. It is only a suggestion; the user may edit it.
 */
export function suggestCode(name: string): string {
  const base = (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .slice(0, 50)
    .replace(/_+$/, '');
  return base;
}
