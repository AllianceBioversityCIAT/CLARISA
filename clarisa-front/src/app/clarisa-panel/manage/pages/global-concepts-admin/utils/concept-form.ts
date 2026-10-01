import { AdminConcept, ConceptStatus } from '../../../../../shared/services/global-concepts/global-concepts-api.service';

/** Everything the concept form edits. Text fields are strings, never null, so inputs bind cleanly. */
export interface ConceptForm {
  term_id: number | null;
  preferred_label: string;
  definition: string;
  short_definition: string;
  scope_note: string;
  example_of_use: string;
  term_type: string | null;
  functions: string[];
  phase_primary: string | null;
  derivation: string | null;
  source_citation: string;
  source_url: string;
  steward: string;
  notes: string;
}

const TEXT_FIELDS = [
  'preferred_label',
  'definition',
  'short_definition',
  'scope_note',
  'example_of_use',
  'source_citation',
  'source_url',
  'steward',
  'notes'
] as const;
const LIST_FIELDS = ['term_type', 'phase_primary', 'derivation'] as const;

export const STATUS_LABELS: Record<ConceptStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  deprecated: 'Deprecated'
};

export function statusSeverity(status: ConceptStatus): string {
  switch (status) {
    case 'approved':
      return 'success';
    case 'deprecated':
      return 'danger';
    case 'in_review':
      return 'warning';
    default:
      return 'info';
  }
}

export function emptyForm(): ConceptForm {
  return {
    term_id: null,
    preferred_label: '',
    definition: '',
    short_definition: '',
    scope_note: '',
    example_of_use: '',
    term_type: null,
    functions: [],
    phase_primary: null,
    derivation: null,
    source_citation: '',
    source_url: '',
    steward: '',
    notes: ''
  };
}

export function formFromConcept(concept: AdminConcept): ConceptForm {
  return {
    term_id: concept.term_id,
    preferred_label: concept.preferred_label ?? '',
    definition: concept.definition ?? '',
    short_definition: concept.short_definition ?? '',
    scope_note: concept.scope_note ?? '',
    example_of_use: concept.example_of_use ?? '',
    term_type: concept.term_type ?? null,
    functions: [...(concept.functions ?? [])],
    phase_primary: concept.phase_primary ?? null,
    derivation: concept.derivation ?? null,
    source_citation: concept.source_citation ?? '',
    source_url: concept.source_url ?? '',
    steward: concept.steward ?? '',
    notes: concept.notes ?? ''
  };
}

/**
 * Body of the write. On create every filled field travels; on update only the
 * fields that changed, so the history the back writes names what the admin
 * actually touched. An emptied field is sent as `''`, which the back stores as
 * null — that is how a value is cleared.
 */
export function buildConceptBody(form: ConceptForm, original: ConceptForm | null): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    const value = (form[field] ?? '').trim();
    if (original ? value !== (original[field] ?? '').trim() : value) body[field] = value;
  }
  for (const field of LIST_FIELDS) {
    const value = form[field] ?? null;
    if (original ? value !== (original[field] ?? null) : value) body[field] = value ?? '';
  }

  const functions = [...(form.functions ?? [])];
  const before = [...(original?.functions ?? [])];
  if (original ? functions.join('|') !== before.join('|') : functions.length) body['functions'] = functions;

  if (!original && form.term_id) body['term_id'] = Number(form.term_id);

  return body;
}
