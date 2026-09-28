import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  AdminConceptDetail,
  AiDraftField,
  ConceptStatus,
  CustomField,
  GlobalConceptsApiService
} from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { ConceptTab, conceptTabs, ConceptTabOption, resolveTab } from '../../utils/concept-editor';
import { activeFields, buildExtra, customFieldsError, CustomValue, valuesFromExtra } from '../../utils/custom-fields';
import { ListOption } from '../../utils/list-values';
import { ConceptOption } from '../gc-concept-picker/gc-concept-picker.component';
import { buildConceptBody, ConceptForm, emptyForm, formFromConcept, STATUS_LABELS, statusSeverity } from '../../utils/concept-form';

export const AI_DRAFT_FIELDS: { field: AiDraftField; label: string }[] = [
  { field: 'short_definition', label: 'Short definition' },
  { field: 'scope_note', label: 'Scope note' },
  { field: 'example_of_use', label: 'Example of use' }
];

/**
 * The concept editor. Details and Custom fields are one write (the concept
 * POST/PATCH, with `extra`); Labels, Relations, Mappings and Icons each save
 * on their own, and only once the concept exists.
 */
@Component({
  selector: 'app-gc-concept-dialog',
  templateUrl: './gc-concept-dialog.component.html',
  styleUrls: ['./gc-concept-dialog.component.scss']
})
export class GcConceptDialogComponent {
  @Input() scheme = 'meliaf';
  @Input() aiEnabled = false;
  @Input() lists: Record<string, ListOption[]> = {};
  @Input() concepts: AdminConceptDetail[] = [];
  /** Emitted when the dialog closes after at least one write, so the host reloads once. */
  @Output() changed = new EventEmitter<void>();

  visible = false;
  tab: ConceptTab = 'details';
  tabs: ConceptTabOption[] = conceptTabs(true);

  editing: AdminConceptDetail | null = null;
  form: ConceptForm = emptyForm();
  private original: ConceptForm | null = null;
  saving = false;
  private wrote = false;

  // --- custom fields ---------------------------------------------------
  fields: CustomField[] = [];
  fieldsLoading = false;
  fieldsError: string | null = null;
  private fieldsScheme: string | null = null;
  values: Record<string, CustomValue> = {};
  private originalValues: Record<string, CustomValue> | null = null;

  // --- AI drafts -------------------------------------------------------
  readonly draftFields = AI_DRAFT_FIELDS;
  drafts: Partial<Record<AiDraftField, string>> = {};
  drafting: Partial<Record<AiDraftField, boolean>> = {};
  draftErrors: Partial<Record<AiDraftField, string>> = {};
  /** Fields whose text came from an accepted AI draft in this session. */
  aiAccepted = new Set<AiDraftField>();

  // --- status ----------------------------------------------------------
  readonly statusChoices = (Object.keys(STATUS_LABELS) as ConceptStatus[]).map(value => ({ label: STATUS_LABELS[value], value }));
  newStatus: ConceptStatus | null = null;
  replacementTermId: number | null = null;
  deprecationReason = '';
  changingStatus = false;

  // --- history ---------------------------------------------------------
  history: { action: string; changes: Record<string, unknown> | null; changed_by_email?: string | null; changed_at: string }[] = [];
  historyLoading = false;
  historyError: string | null = null;
  private historyFor: number | null = null;

  constructor(
    private readonly _api: GlobalConceptsApiService,
    private readonly _messageService: MessageService,
    private readonly _confirmationService: ConfirmationService
  ) {}

  // ---------------------------------------------------------------- open

  openCreate(prefillLabel = ''): void {
    this.editing = null;
    this.form = { ...emptyForm(), preferred_label: prefillLabel.trim() };
    this.original = null;
    this.startSession();
    this.visible = true;
  }

  openEdit(concept: AdminConceptDetail, tab: ConceptTab = 'details'): void {
    this.editing = concept;
    this.form = formFromConcept(concept);
    this.original = formFromConcept(concept);
    this.startSession(tab);
    this.visible = true;
  }

  private startSession(tab: ConceptTab = 'details'): void {
    this.wrote = false;
    this.saving = false;
    this.drafts = {};
    this.drafting = {};
    this.draftErrors = {};
    this.aiAccepted = new Set();
    this.history = [];
    this.historyFor = null;
    this.historyError = null;
    this.resetStatusForm();
    this.tabs = conceptTabs(!this.editing);
    this.tab = resolveTab(tab, !this.editing);
    this.syncValues();
    this.loadFields();
  }

  close(): void {
    if (this.saving || this.changingStatus) return;
    this.visible = false;
    this.onHide();
  }

  /** p-dialog hides itself on Esc / mask click too; this is where the host hears about writes. */
  onHide(): void {
    if (this.wrote) {
      this.wrote = false;
      this.changed.emit();
    }
  }

  selectTab(option: ConceptTabOption): void {
    if (option.lockedReason) return;
    this.tab = option.id;
    if (option.id === 'history') this.loadHistory();
  }

  get conceptOptions(): ConceptOption[] {
    return (this.concepts ?? []).map(concept => ({ term_id: concept.term_id, preferred_label: concept.preferred_label, status: concept.status }));
  }

  optionsFor(code: string): ListOption[] {
    return this.lists[code] ?? [];
  }

  statusLabel(status: ConceptStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  statusSeverity(status: ConceptStatus): string {
    return statusSeverity(status);
  }

  get publicUrl(): string | null {
    return this.editing ? `/landing-page/global-concepts/${encodeURIComponent(this.scheme)}/${this.editing.term_id}` : null;
  }

  /** A sub-editor wrote: its answer is the concept as it is now. */
  onConceptUpdated(updated: AdminConceptDetail | null | undefined): void {
    this.wrote = true;
    if (!updated || !this.editing) return;
    // Keep the unsaved Details edits; only the parts the sub-editor owns change.
    this.editing = { ...this.editing, ...updated };
  }

  onSubWrite(): void {
    this.wrote = true;
  }

  // -------------------------------------------------------- custom fields

  private loadFields(): void {
    if (this.fieldsScheme === this.scheme && !this.fieldsError) return;
    this.fieldsLoading = true;
    this.fieldsError = null;
    this._api.fields(this.scheme).subscribe({
      next: fields => {
        this.fieldsLoading = false;
        this.fieldsScheme = this.scheme;
        this.fields = activeFields(Array.isArray(fields) ? fields : []);
        this.syncValues();
      },
      error: error => {
        this.fieldsLoading = false;
        this.fields = [];
        this.fieldsError = apiErrorMessage(error, 'The custom fields could not be loaded');
      }
    });
  }

  retryFields(): void {
    this.fieldsScheme = null;
    this.loadFields();
  }

  private syncValues(): void {
    const extra = this.editing?.extra ?? {};
    this.values = valuesFromExtra(this.fields, extra);
    this.originalValues = this.editing ? valuesFromExtra(this.fields, extra) : null;
  }

  get customError(): string | null {
    return customFieldsError(this.fields, this.values, !this.editing, this.originalValues);
  }

  // ------------------------------------------------------------ AI draft

  canDraft(): boolean {
    return this.aiEnabled && !!this.form.preferred_label.trim();
  }

  draft(field: AiDraftField): void {
    if (!this.canDraft() || this.drafting[field]) return;
    this.drafting = { ...this.drafting, [field]: true };
    this.draftErrors = { ...this.draftErrors, [field]: undefined };
    this._api
      .aiDraft(this.scheme, { preferred_label: this.form.preferred_label.trim(), definition: this.form.definition.trim(), fields: [field] })
      .subscribe({
        next: answer => {
          this.drafting = { ...this.drafting, [field]: false };
          const text = (answer?.[field] ?? '').trim();
          if (text) this.drafts = { ...this.drafts, [field]: text };
          else this.draftErrors = { ...this.draftErrors, [field]: 'The AI had nothing to suggest. Add a definition and try again.' };
        },
        error: error => {
          this.drafting = { ...this.drafting, [field]: false };
          this.draftErrors = { ...this.draftErrors, [field]: apiErrorMessage(error, 'The draft could not be generated') };
        }
      });
  }

  acceptDraft(field: AiDraftField): void {
    const text = this.drafts[field];
    if (!text) return;
    this.form[field] = field === 'short_definition' ? text.slice(0, 500) : text;
    this.aiAccepted.add(field);
    this.discardDraft(field);
  }

  discardDraft(field: AiDraftField): void {
    const drafts = { ...this.drafts };
    delete drafts[field];
    this.drafts = drafts;
  }

  // ----------------------------------------------------------------- save

  get formError(): string | null {
    if (!this.form.preferred_label.trim()) return 'The preferred label is required.';
    if (this.form.short_definition.length > 500) return 'The short definition is limited to 500 characters.';
    const url = this.form.source_url.trim();
    if (url && !/^https?:\/\//i.test(url)) return 'The source URL must start with http:// or https://.';
    const custom = this.customError;
    return custom ? `Custom fields: ${custom}` : null;
  }

  /** The write: changed Details fields, changed custom values in `extra`, and the AI provenance when a draft was accepted. */
  buildBody(): Record<string, unknown> {
    const body = buildConceptBody(this.form, this.original);
    const extra = buildExtra(this.fields, this.values, this.originalValues);
    if (extra) body['extra'] = extra;
    if (this.aiAccepted.size) {
      body['ai_generated_fields'] = [...new Set([...(this.editing?.ai_generated_fields ?? []), ...this.aiAccepted])];
    }
    return body;
  }

  get hasChanges(): boolean {
    return Object.keys(this.buildBody()).length > 0;
  }

  save(): void {
    if (this.saving || this.formError) return;
    const body = this.buildBody();
    const editing = this.editing;
    if (editing && !Object.keys(body).length) {
      this.close();
      return;
    }

    this.saving = true;
    const request = editing ? this._api.updateConcept(this.scheme, editing.term_id, body) : this._api.createConcept(this.scheme, body);
    request.subscribe({
      next: concept => {
        this.saving = false;
        this.wrote = true;
        const saved = concept as AdminConceptDetail;
        if (editing) {
          this._messageService.add({
            severity: 'success',
            summary: 'Concept updated',
            detail: `${saved?.preferred_label ?? editing.preferred_label} — logged as a direct admin edit.`
          });
          this.close();
          return;
        }
        // A new concept stays open: labels, relations and icons need it to exist.
        this._messageService.add({
          severity: 'success',
          summary: 'Concept created',
          detail: `${saved?.term_id ?? ''} · ${saved?.preferred_label ?? body['preferred_label'] ?? ''}. Labels, relations, mappings and icons are open now.`
        });
        if (saved?.term_id) this.openEditAfterCreate(saved);
        else this.close();
      },
      error: error => {
        this.saving = false;
        this._messageService.add({ severity: 'error', summary: 'Error', detail: apiErrorMessage(error) });
      }
    });
  }

  private openEditAfterCreate(concept: AdminConceptDetail): void {
    const wrote = this.wrote;
    this.openEdit(concept);
    this.wrote = wrote;
  }

  // --------------------------------------------------------------- status

  private resetStatusForm(): void {
    this.newStatus = null;
    this.replacementTermId = null;
    this.deprecationReason = '';
  }

  /** Concepts a deprecated one can point to: same scheme, approved (the back refuses anything else), not itself. */
  get replacementOptions(): { label: string; value: number }[] {
    return (this.concepts ?? [])
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
      message: `“${concept.preferred_label}” goes from ${this.statusLabel(concept.status)} to ${this.statusLabel(status)}. The change is logged as a direct admin edit.`,
      acceptLabel: 'Change status',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: status === 'deprecated' ? 'btn-caution' : 'btn-brand',
      rejectButtonStyleClass: 'btn-ghost',
      accept: () => {
        if (this.changingStatus) return;
        this.changingStatus = true;
        this._api.setStatus(this.scheme, concept.term_id, body).subscribe({
          next: updated => {
            this.changingStatus = false;
            this.wrote = true;
            this._messageService.add({
              severity: 'success',
              summary: 'Status changed',
              detail: `${updated?.preferred_label ?? concept.preferred_label} is now ${this.statusLabel(updated?.status ?? status)}.`
            });
            this.close();
          },
          error: error => {
            this.changingStatus = false;
            this._messageService.add({ severity: 'error', summary: 'Error', detail: apiErrorMessage(error) });
          }
        });
      }
    });
  }

  // -------------------------------------------------------------- history

  loadHistory(force = false): void {
    const concept = this.editing;
    if (!concept || this.historyLoading || (!force && this.historyFor === concept.term_id)) return;
    this.historyLoading = true;
    this.historyError = null;
    this._api.adminConcept(this.scheme, concept.term_id).subscribe({
      next: detail => {
        this.historyLoading = false;
        this.historyFor = concept.term_id;
        const rows = (Array.isArray(detail?.history) ? detail.history : []) as GcConceptDialogComponent['history'];
        this.history = [...rows].sort((a, b) => String(b.changed_at).localeCompare(String(a.changed_at)));
      },
      error: error => {
        this.historyLoading = false;
        this.historyError = apiErrorMessage(error, 'The history could not be loaded');
      }
    });
  }

  actionLabel(action: string): string {
    const text = (action ?? '').replace(/_/g, ' ').toLowerCase();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '—';
  }

  changedKeys(entry: { changes: Record<string, unknown> | null }): string[] {
    return Object.keys(entry.changes ?? {}).map(key => key.replace(/_/g, ' '));
  }
}
