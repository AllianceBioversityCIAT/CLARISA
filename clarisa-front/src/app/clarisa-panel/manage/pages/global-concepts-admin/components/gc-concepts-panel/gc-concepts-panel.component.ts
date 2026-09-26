import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminConcept, ConceptStatus, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { groupLists, ListOption, listLabel } from '../../utils/list-values';

/** A table row: flat, so every column sorts on the value it shows. */
export interface ConceptRow {
  concept: AdminConcept;
  term_id: number;
  preferred_label: string;
  definition: string;
  status: ConceptStatus;
  functions: string[];
  /** The function labels joined, which is what the Functions column sorts by. */
  functionsText: string;
  version: string;
  date_modified: string;
}

/** Everything the concept form edits. Text fields are strings, never null, so inputs bind cleanly. */
export interface ConceptForm {
  term_id: number | null;
  preferred_label: string;
  definition: string;
  short_definition: string;
  scope_note: string;
  example_of_use: string;
  term_type: string | null;
  meliaf_function: string[];
  meliaf_phase_primary: string | null;
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
const LIST_FIELDS = ['term_type', 'meliaf_phase_primary', 'derivation'] as const;

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
    meliaf_function: [],
    meliaf_phase_primary: null,
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
    meliaf_function: [...(concept.meliaf_function ?? [])],
    meliaf_phase_primary: concept.meliaf_phase_primary ?? null,
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

  const functions = [...(form.meliaf_function ?? [])];
  const before = [...(original?.meliaf_function ?? [])];
  if (original ? functions.join('|') !== before.join('|') : functions.length) body['meliaf_function'] = functions;

  if (!original && form.term_id) body['term_id'] = Number(form.term_id);

  return body;
}

@Component({
  selector: 'app-gc-concepts-panel',
  templateUrl: './gc-concepts-panel.component.html',
  styleUrls: ['./gc-concepts-panel.component.scss']
})
export class GcConceptsPanelComponent implements OnInit, OnChanges {
  @Input() scheme = 'meliaf';
  /** Bumped by the shell after an import. */
  @Input() reloadToken = 0;
  @Input() aiEnabled = false;
  indexing = false;

  loading = false;
  loadError: string | null = null;
  concepts: AdminConcept[] = [];
  rows: ConceptRow[] = [];
  lists: Record<string, ListOption[]> = {};

  search = '';
  statusFilter: ConceptStatus | 'all' = 'all';
  readonly statusOptions = [
    { label: 'All statuses', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'In review', value: 'in_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Deprecated', value: 'deprecated' }
  ];
  readonly statusChoices = this.statusOptions.slice(1);

  // --- dialog --------------------------------------------------------
  dialogVisible = false;
  editing: AdminConcept | null = null;
  form: ConceptForm = emptyForm();
  private original: ConceptForm | null = null;
  saving = false;

  newStatus: ConceptStatus | null = null;
  replacementTermId: number | null = null;
  deprecationReason = '';
  changingStatus = false;

  constructor(
    private readonly _api: GlobalConceptsApiService,
    private readonly _messageService: MessageService,
    private readonly _confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadLists();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const changed = ['scheme', 'reloadToken'].some(key => changes[key] && !changes[key].firstChange);
    if (changed) {
      this.load();
      if (changes['scheme'] && !changes['scheme'].firstChange) this.loadLists();
    }
  }

  load(): void {
    this.loading = true;
    this.loadError = null;
    this._api.adminConcepts(this.scheme).subscribe({
      next: concepts => {
        this.loading = false;
        this.concepts = Array.isArray(concepts) ? concepts : [];
        this.applyFilters();
      },
      error: error => {
        this.loading = false;
        this.loadError = apiErrorMessage(error, 'The concepts could not be loaded');
      }
    });
  }

  private loadLists(): void {
    this._api.lists(this.scheme).subscribe({
      next: response => {
        this.lists = groupLists(response);
        // The Functions column shows labels, which only exist once the lists arrive.
        this.applyFilters();
      },
      error: error => this.toastError(error, 'The controlled lists could not be loaded; the list fields stay empty')
    });
  }

  // ------------------------------------------------------------ table

  applyFilters(): void {
    const needle = this.search.trim().toLowerCase();
    this.rows = this.concepts
      .filter(concept => this.statusFilter === 'all' || concept.status === this.statusFilter)
      .filter(
        concept =>
          !needle ||
          String(concept.term_id).includes(needle) ||
          (concept.preferred_label ?? '').toLowerCase().includes(needle) ||
          (concept.definition ?? '').toLowerCase().includes(needle) ||
          (concept.alternative_labels ?? []).some(label => (label.label ?? '').toLowerCase().includes(needle))
      )
      .map(concept => this.toRow(concept));
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter = 'all';
    this.applyFilters();
  }

  get hasFilters(): boolean {
    return !!this.search.trim() || this.statusFilter !== 'all';
  }

  private toRow(concept: AdminConcept): ConceptRow {
    const functions = (concept.meliaf_function ?? []).map(value => listLabel(this.lists, 'meliaf_function', value));
    return {
      concept,
      term_id: concept.term_id,
      preferred_label: concept.preferred_label ?? '',
      definition: concept.definition ?? '',
      status: concept.status,
      functions,
      functionsText: functions.join(', '),
      version: concept.version ?? '',
      date_modified: concept.date_modified ?? ''
    };
  }

  statusLabel(status: ConceptStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  statusSeverity(status: ConceptStatus): string {
    return statusSeverity(status);
  }

  optionsFor(code: string): ListOption[] {
    return this.lists[code] ?? [];
  }

  // ----------------------------------------------------------- dialog

  openCreate(): void {
    this.editing = null;
    this.form = emptyForm();
    this.original = null;
    this.resetStatusForm();
    this.dialogVisible = true;
  }

  openEdit(concept: AdminConcept): void {
    this.editing = concept;
    this.form = formFromConcept(concept);
    this.original = formFromConcept(concept);
    this.resetStatusForm();
    this.dialogVisible = true;
  }

  private resetStatusForm(): void {
    this.newStatus = null;
    this.replacementTermId = null;
    this.deprecationReason = '';
  }

  get formError(): string | null {
    if (!this.form.preferred_label.trim()) return 'The preferred label is required.';
    if (this.form.short_definition.length > 500) return 'The short definition is limited to 500 characters.';
    const url = this.form.source_url.trim();
    if (url && !/^https?:\/\//i.test(url)) return 'The source URL must start with http:// or https://.';
    return null;
  }

  get hasChanges(): boolean {
    return Object.keys(buildConceptBody(this.form, this.original)).length > 0;
  }

  save(): void {
    if (this.formError || this.saving) return;
    const body = buildConceptBody(this.form, this.original);
    if (this.editing && !Object.keys(body).length) {
      this.dialogVisible = false;
      return;
    }

    this.saving = true;
    const request = this.editing ? this._api.updateConcept(this.scheme, this.editing.term_id, body) : this._api.createConcept(this.scheme, body);

    request.subscribe({
      next: concept => {
        this.saving = false;
        this.dialogVisible = false;
        this._messageService.add({
          severity: 'success',
          summary: this.editing ? 'Concept updated' : 'Concept created',
          detail: `${concept?.preferred_label ?? body['preferred_label'] ?? ''} — logged as a direct admin edit.`
        });
        this.load();
      },
      error: error => {
        this.saving = false;
        this.toastError(error);
      }
    });
  }

  /** Concepts a deprecated one can point to: same scheme, approved (the back refuses anything else), not itself. */
  get replacementOptions(): { label: string; value: number }[] {
    return this.concepts
      .filter(concept => concept.term_id !== this.editing?.term_id && concept.status === 'approved')
      .map(concept => ({ label: `${concept.term_id} — ${concept.preferred_label}`, value: concept.term_id }));
  }

  get statusChangeError(): string | null {
    if (!this.newStatus || !this.editing) return 'Pick the new status.';
    if (this.newStatus === this.editing.status) return 'The concept already has this status.';
    if (this.newStatus === 'deprecated' && !this.replacementTermId && !this.deprecationReason.trim()) {
      return 'To deprecate, name the replacement concept or give a reason.';
    }
    return null;
  }

  changeStatus(): void {
    const concept = this.editing;
    const status = this.newStatus;
    if (!concept || !status || this.statusChangeError || this.changingStatus) return;

    const body: { status: ConceptStatus; replaced_by_term_id?: number; reason?: string } = { status };
    if (status === 'deprecated') {
      if (this.replacementTermId) body.replaced_by_term_id = this.replacementTermId;
      if (this.deprecationReason.trim()) body.reason = this.deprecationReason.trim();
    }

    this._confirmationService.confirm({
      header: `Mark as ${this.statusLabel(status).toLowerCase()}?`,
      message: `“${concept.preferred_label}” goes from ${this.statusLabel(concept.status)} to ${this.statusLabel(
        status
      )}. The change is logged as a direct admin edit.`,
      acceptLabel: 'Change status',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: status === 'deprecated' ? 'btn-caution' : 'btn-brand',
      rejectButtonStyleClass: 'btn-ghost',
      accept: () => {
        this.changingStatus = true;
        this._api.setStatus(this.scheme, concept.term_id, body).subscribe({
          next: updated => {
            this.changingStatus = false;
            this.dialogVisible = false;
            this._messageService.add({
              severity: 'success',
              summary: 'Status changed',
              detail: `${updated?.preferred_label ?? concept.preferred_label} is now ${this.statusLabel(updated?.status ?? status)}.`
            });
            this.load();
          },
          error: error => {
            this.changingStatus = false;
            this.toastError(error);
          }
        });
      }
    });
  }

  private toastError(error: unknown, fallback?: string): void {
    this._messageService.add({ severity: 'error', summary: 'Error', detail: apiErrorMessage(error, fallback) });
  }

  /** Semantic index for duplicate detection (task 3.4); only concepts that changed are paid for. */
  refreshIndex(): void {
    if (this.indexing) return;
    this.indexing = true;
    this._api.refreshEmbeddings(this.scheme).subscribe({
      next: result => {
        this.indexing = false;
        this._messageService.add({
          severity: 'success',
          summary: 'AI index updated',
          detail: `${result.embedded} concept(s) embedded, ${result.unchanged} unchanged.`
        });
      },
      error: error => {
        this.indexing = false;
        this.toastError(error);
      }
    });
  }
}
