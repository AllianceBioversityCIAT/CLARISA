import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { GlobalConceptsApiService, PublicConcept } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { DEFAULT_SCHEME, humanError } from '../../global-concepts.utils';

export type ProposeType = 'new' | 'edit';

/** Same caps as the back DTOs (request.dto.ts, concept-admin.dto.ts). */
const LIMITS = { label: 500, rationale: 5000 };

/**
 * A new concept needs its preferred label; a change needs the concept it is
 * about and at least one field that changes. Checked on the whole group
 * because each rule depends on the request type.
 */
export const proposeRules =
  (fixedTermId: () => number | null): ValidatorFn =>
  (group: AbstractControl): ValidationErrors | null => {
    const value = group.value ?? {};
    const errors: ValidationErrors = {};
    if (value.type === 'new' && !String(value.preferred_label ?? '').trim()) {
      errors['labelRequired'] = true;
    }
    if (value.type === 'edit') {
      const termId = fixedTermId() ?? Number(value.term_id);
      if (!Number.isInteger(termId) || termId < 1) errors['termRequired'] = true;
      const changes = ['preferred_label', 'definition', 'source_citation'].some(key => String(value[key] ?? '').trim());
      if (!changes) errors['changeRequired'] = true;
    }
    return Object.keys(errors).length ? errors : null;
  };

/**
 * Public "Propose a concept" form. Step 1 of the back's two-step flow: the
 * request waits as a draft until the requester opens the emailed link.
 */
@Component({
  selector: 'app-gc-propose-form',
  templateUrl: './propose-form.component.html',
  styleUrls: ['./propose-form.component.scss'],
  // The shared Global Concepts kit is declared once, globally (src/styles/_global-concepts.scss).
  host: { class: 'gc-kit' }
})
export class ProposeFormComponent implements OnChanges {
  @Input() scheme = DEFAULT_SCHEME;
  /** When set, the form proposes a change to this concept. */
  @Input() concept: PublicConcept | null = null;
  /** Shows a Close button that emits `closed`. */
  @Input() closable = false;
  @Output() closed = new EventEmitter<void>();

  readonly limits = LIMITS;
  readonly form: FormGroup;
  sending = false;
  submitted = false;
  sentHours: number | null = null;
  error: string | null = null;

  constructor(
    private _api: GlobalConceptsApiService,
    fb: FormBuilder
  ) {
    this.form = fb.group(
      {
        email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
        type: ['new' as ProposeType],
        term_id: [''],
        preferred_label: ['', [Validators.maxLength(LIMITS.label)]],
        definition: [''],
        source_citation: [''],
        rationale: ['', [Validators.required, Validators.maxLength(LIMITS.rationale)]]
      },
      { validators: proposeRules(() => this.concept?.term_id ?? null) }
    );
  }

  ngOnChanges(): void {
    if (this.concept) {
      this.form.patchValue({ type: 'edit', term_id: String(this.concept.term_id) });
    }
    this.form.updateValueAndValidity();
  }

  get type(): ProposeType {
    return this.form.value.type;
  }

  /** A pasted address often carries spaces, which the email validator rejects. */
  trim(name: string): void {
    const control = this.form.get(name);
    if (typeof control?.value === 'string' && control.value !== control.value.trim()) {
      control.setValue(control.value.trim());
    }
  }

  /** Whether a control should show its error: after a submit attempt or once touched. */
  show(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || this.submitted);
  }

  showGroup(error: string): boolean {
    return !!this.form.errors?.[error] && this.submitted;
  }

  /** The body `POST :scheme/requests/start` expects; empty fields never travel. */
  body(): Record<string, unknown> {
    const value = this.form.value;
    const payload: Record<string, string> = {};
    for (const key of ['preferred_label', 'definition', 'source_citation']) {
      const text = String(value[key] ?? '').trim();
      if (text) payload[key] = text;
    }
    const body: Record<string, unknown> = {
      type: value.type,
      email: String(value.email).trim(),
      rationale: String(value.rationale).trim(),
      payload
    };
    if (value.type === 'edit') {
      body['term_id'] = this.concept?.term_id ?? Number(value.term_id);
    }
    return body;
  }

  submit(): void {
    this.submitted = true;
    this.trim('email');
    this.form.markAllAsTouched();
    if (this.form.invalid || this.sending) return;
    this.sending = true;
    this.error = null;
    this._api.startRequest(this.scheme, this.body()).subscribe({
      next: answer => {
        this.sending = false;
        this.sentHours = answer?.expires_in_hours ?? 24;
      },
      error: (error: HttpErrorResponse) => {
        this.sending = false;
        this.error = humanError(error, {
          notFound: 'The concept you want to change was not found. Check the TERM ID and try again.',
          fallback400: 'Some fields are not valid. Review them and send again.'
        });
      }
    });
  }

  again(): void {
    this.sentHours = null;
    this.submitted = false;
    this.error = null;
    this.form.reset({ email: this.form.value.email, type: this.concept ? 'edit' : 'new', term_id: this.concept ? String(this.concept.term_id) : '' });
  }
}
