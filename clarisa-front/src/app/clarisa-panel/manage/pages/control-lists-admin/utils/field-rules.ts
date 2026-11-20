/**
 * The three rules of a field (Required, Unique, Filterable): the words both
 * «Add field» and «Change rules» show, and what the back allows for each type.
 */
export const RULE_HINTS = {
  required: 'Every record must have a value.',
  unique: 'No two records share a value.',
  indexed: 'Can filter the public address.',
  longText: 'Not available for long text',
  relationFilter: 'A relation can always be used as a filter.',
  uniqueFilter: 'A unique field can always be used as a filter.'
} as const;

/** The back refuses unique and filterable on long text (it cannot index it). */
export function cannotIndex(type: string | null | undefined): boolean {
  return type === 'long_text';
}

/** The public address filters by a field that is unique, filterable or a relation (`data.service.read` of the back). */
export function filterableBy(type: string | null | undefined, unique: boolean, indexed: boolean): boolean {
  return type === 'relation' || unique || indexed;
}
