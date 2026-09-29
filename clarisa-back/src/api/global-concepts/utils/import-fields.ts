/**
 * Target fields of the import wizard, named as in the MELIAF data schema
 * template so an export round-trips into the same Excel (D8b). The hint is
 * what the column usually looks like; the AI column matcher reads it too.
 */
export const IMPORT_FIELDS: { field: string; hint: string }[] = [
  { field: 'term_id', hint: 'Numeric identifier of the term (TERM ID)' },
  { field: 'preferred_label', hint: 'The term itself (TERM, preferred label)' },
  { field: 'language', hint: 'Language code: en, fr or es' },
  {
    field: 'alternative_labels',
    hint: 'Synonyms, acronyms or other spellings, separated by ; or |',
  },
  { field: 'definition', hint: 'Full definition of the term' },
  { field: 'short_definition', hint: 'One-line definition for tooltips' },
  { field: 'scope_note', hint: 'When and how to use the term' },
  { field: 'example_of_use', hint: 'Example sentence using the term' },
  { field: 'term_type', hint: 'Kind of term (list: term type)' },
  {
    field: 'meliaf_function',
    hint: 'MELIAF function(s): Monitoring, Evaluation, Learning, Impact assessment, Foresight',
  },
  {
    field: 'meliaf_phase_primary',
    hint: 'Main MELIAF phase (often the PARENT TERM column)',
  },
  { field: 'meliaf_phase_also', hint: 'Other MELIAF phases' },
  { field: 'broader_terms', hint: 'Parent / broader term(s)' },
  { field: 'related_terms', hint: 'Related term(s)' },
  { field: 'source_citation', hint: 'Source or reference (SOURCE)' },
  { field: 'source_url', hint: 'Link to the source' },
  { field: 'derivation', hint: 'How the term was derived (adopted, adapted…)' },
  { field: 'status', hint: 'Draft, In review, Approved or Deprecated' },
  { field: 'validated_by', hint: 'Who validated the term' },
  { field: 'date_validated', hint: 'Date of validation' },
  { field: 'steward', hint: 'Person or team responsible for the term' },
  { field: 'rights_note', hint: 'Copyright or license notes' },
  { field: 'notes', hint: 'Internal notes (never published)' },
];

export const IMPORT_FIELD_NAMES = IMPORT_FIELDS.map((f) => f.field);
