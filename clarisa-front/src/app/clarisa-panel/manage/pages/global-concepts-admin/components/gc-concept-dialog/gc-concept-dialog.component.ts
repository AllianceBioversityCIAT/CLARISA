import { Component, EventEmitter, Input, Optional, Output } from '@angular/core';
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
import { FIELD_INFO } from '../../utils/field-info';
import { listLabel } from '../../utils/list-values';
import { AssistFieldMeta, assistFields, AssistTab, CUSTOM_PREFIX } from '../../utils/concept-assist';
import { AssistHost, assistChatKey, GcAssistSession } from '../gc-concept-assistant/gc-assist-session.service';
import { StableOptions } from '../../utils/stable-options';
import { conceptLink } from '../../../../../../landing-page/pages/global-concepts/global-concepts.utils';

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
  styleUrls: ['./gc-concept-dialog.component.scss'],
  // One assistant session per dialog: the chat panel and every field mark read it.
  providers: [GcAssistSession]
})
export class GcConceptDialogComponent {
  @Input() scheme = 'meliaf-taxonomy';
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
  /** Bumped each time a concept is opened: answers from an earlier one are dropped. */
  session = 0;
  /** Sub-editor tabs opened in this session; they stay mounted (hidden) so an in-flight save is not lost. */
  visited = new Set<ConceptTab>();

  // --- custom fields ---------------------------------------------------
  fields: CustomField[] = [];
  fieldsLoading = false;
  fieldsError: string | null = null;
  private fieldsScheme: string | null = null;
  values: Record<string, CustomValue> = {};
  private originalValues: Record<string, CustomValue> | null = null;

  // --- AI drafts -------------------------------------------------------
  readonly draftFields = AI_DRAFT_FIELDS;
  readonly info = FIELD_INFO.concept;
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

  // --- assistant (assistant-contract.md) ---------------------------------
  /** `concepts-assist/status` said enabled for this scheme; otherwise the toggle is not drawn. */
  assistAvailable = false;
  assistRemaining: number | null = null;
  private assistStatusFor: string | null = null;
  assistOpen = false;
  /** Mounted once opened, then only hidden, so a turn in flight survives closing the panel. */
  assistMounted = false;
  readonly assist: GcAssistSession;

  constructor(
    private readonly _api: GlobalConceptsApiService,
    private readonly _messageService: MessageService,
    private readonly _confirmationService: ConfirmationService,
    @Optional() assist?: GcAssistSession | null
  ) {
    this.assist = assist ?? new GcAssistSession();
    this.assist.host = this.assistHost();
    this.assist.onAccepted = field => {
      if (AI_DRAFT_FIELDS.some(item => item.field === field)) this.aiAccepted.add(field as AiDraftField);
    };
  }

  // ---------------------------------------------------------------- open

  /**
   * Full create mode. Since 2026-09-30 no screen opens it: «New concept» and
   * Usage go through the short `app-gc-concept-create-dialog`, which then calls
   * `openEdit` on the new concept. Kept (and covered) because nothing it does
   * is wrong, only no longer the entry point.
   */
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
    this.loadAssistStatus();
    this.visible = true;
  }

  private startSession(tab: ConceptTab = 'details'): void {
    this.session++;
    this.wrote = false;
    this.saving = false;
    this.drafts = {};
    this.drafting = {};
    this.draftErrors = {};
    this.aiAccepted = new Set();
    this.history = [];
    this.historyFor = null;
    this.historyLoading = false;
    this.historyError = null;
    this.resetStatusForm();
    this.tabs = conceptTabs(!this.editing);
    this.tab = resolveTab(tab, !this.editing);
    this.visited = new Set([this.tab]);
    this.assist.reset();
    // The concept's chat comes back: the one started in «New concept», or an earlier session's.
    if (this.editing?.term_id) this.assist.attach(assistChatKey(this.scheme, this.editing.term_id));
    this.openAssistIfChatting();
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
    // A playback still running stops here; the chat and the edit log belong to this session only.
    this.assist.reset();
    if (this.wrote) {
      this.wrote = false;
      this.changed.emit();
    }
  }

  selectTab(option: ConceptTabOption): void {
    if (option.lockedReason) return;
    this.tab = option.id;
    this.visited.add(option.id);
    if (option.id === 'history') this.loadHistory();
  }

  private readonly _conceptOptions = new StableOptions<ConceptOption>();
  private readonly _replacementOptions = new StableOptions<{ label: string; value: number }>();

  get conceptOptions(): ConceptOption[] {
    return this._conceptOptions.get([this.concepts], () =>
      (this.concepts ?? []).map(concept => ({ term_id: concept.term_id, preferred_label: concept.preferred_label, status: concept.status }))
    );
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
    return this.editing ? conceptLink(this.scheme, this.editing.term_id).join('/') : null;
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
    this._api.conceptFields(this.scheme).subscribe({
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
    const session = this.session;
    this.drafting = { ...this.drafting, [field]: true };
    this.draftErrors = { ...this.draftErrors, [field]: undefined };
    this._api
      .aiDraft(this.scheme, { preferred_label: this.form.preferred_label.trim(), definition: this.form.definition.trim(), fields: [field] })
      .subscribe({
        next: answer => {
          // The dialog moved on to another concept: this text describes the old one.
          if (session !== this.session) return;
          this.drafting = { ...this.drafting, [field]: false };
          const text = (answer?.[field] ?? '').trim();
          if (text) this.drafts = { ...this.drafts, [field]: text };
          else this.draftErrors = { ...this.draftErrors, [field]: 'The AI had nothing to suggest. Add a definition and try again.' };
        },
        error: error => {
          if (session !== this.session) return;
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
    // The person chose this text: for the assistant it is their edit.
    this.assist.recordHandEdit(field, this.form[field]);
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
    // AI provenance is the full list: accepted drafts join it, and a marked
    // field the editor rewrote by hand (changed without accepting a draft) leaves it.
    // A text the assistant typed and the person kept (or saved while still marked) counts as an accepted draft.
    const accepted = new Set<AiDraftField>(this.aiAccepted);
    for (const item of AI_DRAFT_FIELDS) if (this.assist.isAiOwned(item.field) && item.field in body) accepted.add(item.field);
    const marked = this.editing?.ai_generated_fields ?? [];
    const rewritten = marked.filter(f => f in body && !accepted.has(f as AiDraftField));
    if (accepted.size || rewritten.length) {
      body['ai_generated_fields'] = [...new Set([...marked.filter(f => !rewritten.includes(f)), ...accepted])];
    }
    return body;
  }

  get hasChanges(): boolean {
    return Object.keys(this.buildBody()).length > 0;
  }

  /** Why Save is locked by the assistant right now, or `null` (tooltip of the button). */
  get assistBusyReason(): string | null {
    return this.assist.busy ? 'Wait until the assistant finishes' : null;
  }

  save(): void {
    // Double-submit / half-typed rule: never save while an assistant turn is asked or typed.
    if (this.saving || this.formError || this.assist.busy) return;
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
    return this._replacementOptions.get([this.concepts, this.editing?.term_id], () =>
      (this.concepts ?? [])
        .filter(concept => concept.term_id !== this.editing?.term_id && concept.status === 'approved')
        .map(concept => ({ label: `${concept.term_id} — ${concept.preferred_label}`, value: concept.term_id }))
    );
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
      rejectButtonStyleClass: 'p-button-outlined',
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

  // ------------------------------------------------------------ assistant

  private loadAssistStatus(): void {
    if (this.assistStatusFor === this.scheme) return;
    const scheme = this.scheme;
    this.assistStatusFor = scheme;
    this._api.conceptsAssistStatus(scheme).subscribe({
      next: status => {
        if (scheme !== this.scheme) return;
        this.assistAvailable = !!status?.enabled;
        this.assistRemaining = typeof status?.remainingUsd === 'number' ? status.remainingUsd : null;
        if (!this.assistAvailable) this.assistOpen = false;
        else this.openAssistIfChatting();
      },
      // No AI for this user (403) or an older back (404): the assistant simply is not there, and is not asked
      // again for this scheme. A network or server hiccup is asked again on the next concept.
      error: error => {
        this.assistAvailable = false;
        this.assistOpen = false;
        if (!error?.status || error.status >= 500) this.assistStatusFor = null;
      }
    });
  }

  /** A conversation is going on for this concept (e.g. it started in «New concept»): the panel opens with it. */
  private openAssistIfChatting(): void {
    if (this.assistShown && this.assist.messages.length) {
      this.assistOpen = true;
      this.assistMounted = true;
    }
  }

  /** Full editor only: the assistant needs an existing concept and an enabled status. */
  get assistShown(): boolean {
    return this.assistAvailable && !!this.editing;
  }

  toggleAssist(): void {
    if (!this.assistShown) return;
    this.assistOpen = !this.assistOpen;
    if (this.assistOpen) this.assistMounted = true;
  }

  get dialogStyle(): Record<string, string> {
    return { width: this.assistShown && this.assistOpen ? 'min(1320px, 96vw)' : '920px' };
  }

  /** A control's ngModelChange: only the person's input reaches it, never a programmatic write. */
  onHandEdit(field: string, value: unknown): void {
    this.assist.recordHandEdit(field, value);
  }

  onCustomEdit(event: { code: string; value: unknown }): void {
    this.onHandEdit(`${CUSTOM_PREFIX}${event.code}`, event.value);
  }

  private assistMeta(field: string): AssistFieldMeta | null {
    return assistFields(this.fields).find(meta => meta.field === field) ?? null;
  }

  private assistHost(): AssistHost {
    const custom = (field: string) => (field.startsWith(CUSTOM_PREFIX) ? field.slice(CUSTOM_PREFIX.length) : null);
    return {
      currentTab: () => this.tab,
      setTab: (tab: AssistTab) => {
        const option = this.tabs.find(item => item.id === tab);
        if (option) this.selectTab(option);
      },
      meta: field => this.assistMeta(field),
      read: field => {
        const code = custom(field);
        return code !== null ? this.values[code] : (this.form as unknown as Record<string, unknown>)[field];
      },
      write: (field, value) => {
        const code = custom(field);
        if (code !== null) this.values[code] = value as CustomValue;
        else (this.form as unknown as Record<string, unknown>)[field] = value;
      },
      baseline: field => {
        const code = custom(field);
        if (code !== null) return this.originalValues?.[code] ?? valuesFromExtra(this.fields, {})[code];
        return ((this.original ?? emptyForm()) as unknown as Record<string, unknown>)[field];
      },
      display: (field, value) => {
        const meta = this.assistMeta(field);
        const listCode = meta?.listCode;
        const items = Array.isArray(value) ? value : value === null || value === undefined || value === '' ? [] : [value];
        if (meta?.numeric && meta.kind === 'multi') {
          return items.map(id => this.conceptOptions.find(option => option.term_id === Number(id))?.preferred_label ?? `TERM ${id}`).join(', ');
        }
        return items.map(item => (listCode ? listLabel(this.lists, listCode, String(item)) : String(item))).join(', ');
      },
      draft: () => {
        const draft: Record<string, unknown> = {};
        for (const meta of assistFields(this.fields)) {
          const code = custom(meta.field);
          draft[meta.field] = code !== null ? this.values[code] : (this.form as unknown as Record<string, unknown>)[meta.field];
        }
        return draft;
      },
      termId: () => this.editing?.term_id ?? null
    };
  }

  // -------------------------------------------------------------- history

  loadHistory(force = false): void {
    const concept = this.editing;
    if (!concept || this.historyLoading || (!force && this.historyFor === concept.term_id)) return;
    const session = this.session;
    this.historyLoading = true;
    this.historyError = null;
    this._api.adminConcept(this.scheme, concept.term_id).subscribe({
      next: detail => {
        // Another concept is open now: this history is not its history.
        if (session !== this.session || this.editing?.term_id !== concept.term_id) return;
        this.historyLoading = false;
        this.historyFor = concept.term_id;
        const rows = (Array.isArray(detail?.history) ? detail.history : []) as GcConceptDialogComponent['history'];
        this.history = [...rows].sort((a, b) => String(b.changed_at).localeCompare(String(a.changed_at)));
      },
      error: error => {
        if (session !== this.session) return;
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
