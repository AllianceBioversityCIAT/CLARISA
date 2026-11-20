import { FieldTypeOption } from '../models/control-lists.models';

export interface TypeChoice {
  value: string;
  /** The name a person reads; the back's own label when the type is new to this screen. */
  label: string;
  example: string;
  icon: string;
}

/** Reading order of the picker: related types sit side by side in its two columns. */
const KNOWN: TypeChoice[] = [
  { value: 'text', label: 'Short text', example: 'A name, a code, a title', icon: 'pi-minus' },
  { value: 'long_text', label: 'Long text', example: 'A description, notes', icon: 'pi-align-left' },
  { value: 'integer', label: 'Whole number', example: '12 · 2026', icon: 'pi-hashtag' },
  { value: 'decimal', label: 'Decimal number', example: '3.75 · 0.5', icon: 'pi-percentage' },
  { value: 'boolean', label: 'Yes / No', example: 'Active or not', icon: 'pi-check-square' },
  { value: 'relation', label: 'Options', example: 'Pick one from a list', icon: 'pi-list' },
  { value: 'date', label: 'Date', example: '2026-03-15', icon: 'pi-calendar' },
  { value: 'datetime', label: 'Date and time', example: '2026-03-15 14:30', icon: 'pi-clock' },
  { value: 'url', label: 'Link', example: 'https://…', icon: 'pi-link' },
  { value: 'email', label: 'E-mail', example: 'name@cgiar.org', icon: 'pi-envelope' }
];

/** The types the back offers, in the picker's order and with the words of this screen. */
export function typeChoices(types: FieldTypeOption[]): TypeChoice[] {
  const offered = new Map(types.map(t => [String(t.value), t]));
  const known = KNOWN.filter(k => offered.has(k.value));
  const unknown = types
    .filter(t => !KNOWN.some(k => k.value === t.value))
    .map(t => ({ value: String(t.value), label: t.label, example: '', icon: 'pi-circle' }));
  return [...known, ...unknown];
}

/** The name of a type on screen; the back's label when this screen does not know the type. */
export function typeName(value: string, fallback?: string | null): string {
  return KNOWN.find(k => k.value === value)?.label ?? fallback ?? value;
}

export const MAX_INLINE_OPTIONS = 100;
const MAX_OPTION_LENGTH = 255;

/** The options a person wrote, one per line: trimmed, blank lines dropped. */
export function parseOptions(text: string): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line !== '');
}

/** Text compared the way the options lists and the unique indexes of MySQL compare it: without case or accents. */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** The options list keeps unique names, and its table compares without case or accents. */
function optionKey(option: string): string {
  return foldText(option);
}

/** Why the written options cannot be saved, or `''`. An empty list is not an error to show: it is just not ready. */
export function optionsProblem(options: string[]): string {
  if (options.length > MAX_INLINE_OPTIONS) {
    return `A field can start with ${MAX_INLINE_OPTIONS} options at most; add the rest in the list afterwards.`;
  }
  const seen = new Set<string>();
  for (const option of options) {
    if (option.length > MAX_OPTION_LENGTH) return `"${option.slice(0, 40)}…" is longer than ${MAX_OPTION_LENGTH} characters.`;
    const key = optionKey(option);
    if (seen.has(key)) return `"${option}" is repeated.`;
    seen.add(key);
  }
  return '';
}

/** A list code nobody uses yet: `base`, then `base_2`, `base_3`… within the 50 characters of a code. */
export function freeCode(base: string, taken: string[]): string {
  if (!base || !taken.includes(base)) return base;
  for (let n = 2; n < 100; n++) {
    const suffix = `_${n}`;
    const candidate = base.slice(0, 50 - suffix.length) + suffix;
    if (!taken.includes(candidate)) return candidate;
  }
  return base;
}
