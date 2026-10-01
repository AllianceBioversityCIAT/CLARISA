import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  AdminConceptDetail,
  ConceptMapping,
  GlobalConceptsApiService,
  MappingInput,
  MatchType
} from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { isHttpUrl } from '../../utils/concept-editor';
import { FIELD_INFO } from '../../utils/field-info';

export interface MappingForm {
  target_scheme: string;
  target_uri: string;
  target_label: string;
  match_type: MatchType;
  /** How the match was made; '' = not said. The back only accepts these two from a form. */
  justification: MappingJustification | '' | null;
  /** 0–1, as typed; '' / null = not said. */
  confidence: number | string | null;
}

export type MappingJustification = 'manual' | 'lexical';

export const MAPPING_JUSTIFICATIONS: { label: string; value: MappingJustification }[] = [
  { label: 'Manual review', value: 'manual' },
  { label: 'Lexical match', value: 'lexical' }
];

export const MATCH_TYPES: { label: string; value: MatchType; hint: string }[] = [
  { label: 'Exact match', value: 'exact', hint: 'Interchangeable in any context' },
  { label: 'Close match', value: 'close', hint: 'Interchangeable in some contexts' },
  { label: 'Broad match', value: 'broad', hint: 'The target is more general' },
  { label: 'Narrow match', value: 'narrow', hint: 'The target is more specific' },
  { label: 'Related match', value: 'related', hint: 'Associated, not equivalent' }
];

export function emptyMappingForm(): MappingForm {
  return { target_scheme: '', target_uri: '', target_label: '', match_type: 'exact', justification: '', confidence: null };
}

export function mappingFormError(form: MappingForm): string | null {
  if (!form.target_scheme.trim()) return 'Name the target vocabulary (AGROVOC, Wikidata…).';
  if (!form.target_uri.trim()) return 'Paste the URI of the target concept.';
  if (!isHttpUrl(form.target_uri)) return 'The target URI must start with http:// or https://.';
  if (confidenceValue(form.confidence) === undefined && !confidenceEmpty(form.confidence)) return 'Confidence is a number between 0 and 1.';
  return null;
}

const confidenceEmpty = (value: MappingForm['confidence']): boolean => value === null || value === undefined || String(value).trim() === '';

/** A finite number in 0..1, or undefined when empty / out of range. */
export function confidenceValue(value: MappingForm['confidence']): number | undefined {
  if (confidenceEmpty(value)) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : undefined;
}

export function mappingBody(form: MappingForm): MappingInput {
  const body: MappingInput = { target_scheme: form.target_scheme.trim(), target_uri: form.target_uri.trim(), match_type: form.match_type };
  if (form.target_label.trim()) body.target_label = form.target_label.trim();
  if (MAPPING_JUSTIFICATIONS.some(option => option.value === form.justification)) body.justification = form.justification as MappingJustification;
  const confidence = confidenceValue(form.confidence);
  if (confidence !== undefined) body.confidence = confidence;
  return body;
}

/** Links from this concept to the same idea in an outside vocabulary (SKOS mappings). */
@Component({
  selector: 'app-gc-mappings-editor',
  templateUrl: './gc-mappings-editor.component.html',
  styleUrls: ['./gc-mappings-editor.component.scss']
})
export class GcMappingsEditorComponent {
  @Input() scheme = 'meliaf';
  @Input() concept: AdminConceptDetail | null = null;
  @Output() updated = new EventEmitter<AdminConceptDetail>();

  readonly matchTypes = MATCH_TYPES;
  readonly justifications = MAPPING_JUSTIFICATIONS;
  readonly info = FIELD_INFO.mapping;
  form: MappingForm = emptyMappingForm();
  adding = false;
  deletingId: number | null = null;
  error: string | null = null;
  showForm = false;

  constructor(
    private readonly _api: GlobalConceptsApiService,
    private readonly _messageService: MessageService,
    private readonly _confirmationService: ConfirmationService
  ) {}

  /** The admin shape carries ids (`mappings_all`); without it the rows show but cannot be deleted. */
  get mappings(): (ConceptMapping & { id?: number })[] {
    return this.concept?.mappings_all ?? this.concept?.mappings ?? [];
  }

  matchLabel(value: string): string {
    return MATCH_TYPES.find(type => type.value === value)?.label ?? value;
  }

  /** Rows carry the SSSOM code (`manual`, `lexical`, `ai_suggested`); show it in words. */
  justificationLabel(value: string | null | undefined): string {
    if (!value) return '';
    if (value === 'ai_suggested') return 'AI suggestion';
    return MAPPING_JUSTIFICATIONS.find(option => option.value === value)?.label ?? value;
  }

  get formError(): string | null {
    return mappingFormError(this.form);
  }

  openForm(): void {
    this.form = emptyMappingForm();
    this.error = null;
    this.showForm = true;
  }

  add(): void {
    const concept = this.concept;
    if (!concept || this.adding || this.formError) return;
    this.adding = true;
    this.error = null;
    this._api.addMapping(this.scheme, concept.term_id, mappingBody(this.form)).subscribe({
      next: updated => {
        this.adding = false;
        this.showForm = false;
        this._messageService.add({ severity: 'success', summary: 'Mapping added', detail: `${this.form.target_scheme.trim()} · ${this.matchLabel(this.form.match_type)}` });
        this.form = emptyMappingForm();
        this.updated.emit(updated);
      },
      error: error => {
        this.adding = false;
        this.error = apiErrorMessage(error, 'The mapping could not be added');
      }
    });
  }

  remove(mapping: { id?: number; target_scheme: string; target_uri: string }): void {
    const concept = this.concept;
    if (!concept || !mapping.id || this.deletingId) return;
    const id = mapping.id;
    this._confirmationService.confirm({
      header: 'Remove this mapping?',
      message: `${mapping.target_scheme} · ${mapping.target_uri}. It disappears from the exports at the next release.`,
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'btn-caution',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        this.deletingId = id;
        this.error = null;
        this._api.removeMapping(this.scheme, concept.term_id, id).subscribe({
          next: updated => {
            this.deletingId = null;
            this._messageService.add({ severity: 'success', summary: 'Mapping removed', detail: mapping.target_uri });
            this.updated.emit(updated);
          },
          error: error => {
            this.deletingId = null;
            this.error = apiErrorMessage(error, 'The mapping could not be removed');
          }
        });
      }
    });
  }
}
