import { Component, EventEmitter, Input, OnDestroy, Optional, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { AdminConceptDetail, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { FIELD_INFO } from '../../utils/field-info';
import { AssistFieldMeta, cloneValue } from '../../utils/concept-assist';
import { AssistHost, assistChatKey, GcAssistSession, handOverChat } from '../gc-concept-assistant/gc-assist-session.service';

/** The two fields of the short form the assistant may fill (ids of this dialog's controls). */
export const CREATE_ASSIST_FIELDS: AssistFieldMeta[] = [
  { field: 'preferred_label', label: 'Preferred label', tab: 'details', elementId: 'gc-new-label', kind: 'text' },
  { field: 'definition', label: 'Definition', tab: 'details', elementId: 'gc-new-definition', kind: 'text' }
];

/** The three things the short form asks. Everything else waits for the full editor. */
export interface QuickConceptForm {
  preferred_label: string;
  definition: string;
  term_id: number | null;
}

/**
 * A create failure, in a sentence the admin can act on. The back answers a
 * clash with a 409 whose text names the field (`term_id 12 is already used…`,
 * `"X" is already the preferred label…`); the raw text reads like a log line.
 */
export function createErrorMessage(error: unknown, form: QuickConceptForm): string {
  const raw = apiErrorMessage(error, '');
  const status = (error as { status?: number } | null)?.status;
  const text = raw.toLowerCase();

  if (text.includes('term_id') && text.includes('already')) {
    const code = form.term_id ? `TERM ID ${form.term_id}` : 'That TERM ID';
    return `${code} already belongs to another concept. Leave it empty to get the next free code, or keep a different one.`;
  }
  if (text.includes('preferred label') && text.includes('already')) {
    return `Another concept is already called “${form.preferred_label.trim()}”. Find it in the list, or give this one a different name.`;
  }
  if (status === 409) {
    return `This concept clashes with one that already exists${raw ? `: ${raw}` : '.'}`;
  }
  return raw || 'The concept could not be created. Try again in a moment.';
}

/**
 * «New concept», short: the label (required), the definition (what readers
 * need) and, tucked away, an existing TERM ID. On success it hands the new
 * concept to the host, which opens the full editor on it (Yeck, 30-sep-2026:
 * «que pida lo más básico y obligatorio; apenas lo cree se abre este modal
 * completo»).
 */
@Component({
  selector: 'app-gc-concept-create-dialog',
  templateUrl: './gc-concept-create-dialog.component.html',
  styleUrls: ['./gc-concept-create-dialog.component.scss'],
  // Its own assistant session: the chat starts here and moves to the full editor on create.
  providers: [GcAssistSession]
})
export class GcConceptCreateDialogComponent implements OnDestroy {
  @Input() scheme = 'meliaf-taxonomy';
  /** The concept exists: the host reloads its list and opens the full editor on it. */
  @Output() created = new EventEmitter<AdminConceptDetail>();

  readonly info = FIELD_INFO.concept;
  visible = false;
  form: QuickConceptForm = { preferred_label: '', definition: '', term_id: null };
  showTermId = false;
  saving = false;
  error: string | null = null;

  /**
   * The assistant, from the first moment (Yeck, 2026-10-01): open by default
   * when the AI is on for this scheme, so the person says what they need and
   * it asks for and fills the required fields. Not drawn when it is off.
   */
  assistAvailable = false;
  assistRemaining: number | null = null;
  assistOpen = false;
  private assistStatusFor: string | null = null;
  readonly assist: GcAssistSession;

  constructor(
    private readonly _api: GlobalConceptsApiService,
    private readonly _messageService: MessageService,
    @Optional() assist?: GcAssistSession | null
  ) {
    this.assist = assist ?? new GcAssistSession();
    this.assist.host = this.assistHost();
  }

  ngOnDestroy(): void {
    this.assist.reset();
  }

  open(prefillLabel = ''): void {
    if (this.saving) return;
    this.form = { preferred_label: (prefillLabel ?? '').trim(), definition: '', term_id: null };
    this.showTermId = false;
    this.error = null;
    this.assist.reset();
    // The chat of a concept still being created survives a closed dialog or a reload.
    this.assist.attach(assistChatKey(this.scheme, null));
    this.visible = true;
    this.loadAssistStatus();
  }

  close(): void {
    if (this.saving) return;
    this.visible = false;
    this.onHide();
  }

  /** Esc / mask click too: a playback still running stops; the stored chat stays. */
  onHide(): void {
    this.assist.reset();
  }

  toggleAssist(): void {
    if (!this.assistAvailable) return;
    this.assistOpen = !this.assistOpen;
  }

  get dialogStyle(): Record<string, string> {
    return { width: this.assistAvailable && this.assistOpen ? 'min(1080px, 96vw)' : '560px' };
  }

  private loadAssistStatus(): void {
    if (this.assistStatusFor === this.scheme) {
      this.assistOpen = this.assistAvailable;
      return;
    }
    const scheme = this.scheme;
    this.assistStatusFor = scheme;
    this._api.conceptsAssistStatus(scheme).subscribe({
      next: status => {
        if (scheme !== this.scheme) return;
        this.assistAvailable = !!status?.enabled;
        this.assistRemaining = typeof status?.remainingUsd === 'number' ? status.remainingUsd : null;
        this.assistOpen = this.assistAvailable;
      },
      // No AI for this user (403) or an older back (404): the form works without it.
      error: error => {
        this.assistAvailable = false;
        this.assistOpen = false;
        if (!error?.status || error.status >= 500) this.assistStatusFor = null;
      }
    });
  }

  private assistHost(): AssistHost {
    const meta = (field: string) => CREATE_ASSIST_FIELDS.find(item => item.field === field) ?? null;
    const form = () => this.form as unknown as Record<string, unknown>;
    return {
      currentTab: () => 'details',
      setTab: () => undefined,
      meta,
      read: field => form()[field],
      write: (field, value) => {
        if (meta(field)) form()[field] = cloneValue(value);
      },
      baseline: () => '',
      display: (_field, value) => String(value ?? ''),
      draft: () => ({ preferred_label: this.form.preferred_label, definition: this.form.definition }),
      termId: () => null
    };
  }

  toggleTermId(): void {
    this.showTermId = !this.showTermId;
  }

  /** A clash message stays until the admin changes something: then it is about a value that is gone. */
  touched(field?: 'preferred_label' | 'definition'): void {
    this.error = null;
    // Typed by the person: from now on the assistant proposes instead of typing over it.
    if (field) this.assist.recordHandEdit(field, this.form[field]);
  }

  /** Why Create is locked by the assistant right now, or `null`. */
  get assistBusyReason(): string | null {
    return this.assist.busy ? 'Wait until the assistant finishes' : null;
  }

  get formError(): string | null {
    return this.form.preferred_label.trim() ? null : 'The preferred label is required.';
  }

  buildBody(): Record<string, unknown> {
    const body: Record<string, unknown> = { preferred_label: this.form.preferred_label.trim() };
    const definition = this.form.definition.trim();
    if (definition) body['definition'] = definition;
    const termId = Number(this.form.term_id);
    if (this.form.term_id !== null && Number.isInteger(termId) && termId > 0) body['term_id'] = termId;
    return body;
  }

  create(): void {
    // Locked synchronously: a second click or Enter before the answer is a no-op;
    // and never mid-typing, or a half-written text would be saved.
    if (this.saving || this.formError || this.assist.busy) return;
    this.saving = true;
    this.error = null;
    const body = this.buildBody();

    this._api.createConcept(this.scheme, body).subscribe({
      next: concept => {
        this.saving = false;
        const saved = concept as AdminConceptDetail;
        // The same conversation goes on in the full editor of the new concept.
        if (saved?.term_id) handOverChat(this.scheme, saved.term_id);
        this.visible = false;
        this.assist.reset();
        this._messageService.add({
          severity: 'success',
          summary: 'Concept created',
          detail: `${saved?.term_id ? `${saved.term_id} · ` : ''}${saved?.preferred_label ?? body['preferred_label']} — complete the rest when you are ready.`
        });
        this.created.emit(saved);
      },
      error: error => {
        this.saving = false;
        this.error = createErrorMessage(error, this.form);
        // The clash is on the tucked-away field: show it, or the sentence points at nothing.
        if (this.error.includes('TERM ID')) this.showTermId = true;
      }
    });
  }
}
