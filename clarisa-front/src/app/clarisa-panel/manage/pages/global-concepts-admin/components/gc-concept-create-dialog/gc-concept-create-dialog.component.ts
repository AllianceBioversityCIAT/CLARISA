import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { AdminConceptDetail, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { FIELD_INFO } from '../../utils/field-info';

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
  styleUrls: ['./gc-concept-create-dialog.component.scss']
})
export class GcConceptCreateDialogComponent {
  @Input() scheme = 'concepts';
  /** The concept exists: the host reloads its list and opens the full editor on it. */
  @Output() created = new EventEmitter<AdminConceptDetail>();

  readonly info = FIELD_INFO.concept;
  visible = false;
  form: QuickConceptForm = { preferred_label: '', definition: '', term_id: null };
  showTermId = false;
  saving = false;
  error: string | null = null;

  constructor(
    private readonly _api: GlobalConceptsApiService,
    private readonly _messageService: MessageService
  ) {}

  open(prefillLabel = ''): void {
    if (this.saving) return;
    this.form = { preferred_label: (prefillLabel ?? '').trim(), definition: '', term_id: null };
    this.showTermId = false;
    this.error = null;
    this.visible = true;
  }

  close(): void {
    if (this.saving) return;
    this.visible = false;
  }

  toggleTermId(): void {
    this.showTermId = !this.showTermId;
  }

  /** A clash message stays until the admin changes something: then it is about a value that is gone. */
  touched(): void {
    this.error = null;
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
    // Locked synchronously: a second click or Enter before the answer is a no-op.
    if (this.saving || this.formError) return;
    this.saving = true;
    this.error = null;
    const body = this.buildBody();

    this._api.createConcept(this.scheme, body).subscribe({
      next: concept => {
        this.saving = false;
        const saved = concept as AdminConceptDetail;
        this.visible = false;
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
