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

export interface MappingForm {
  target_scheme: string;
  target_uri: string;
  target_label: string;
  match_type: MatchType;
  justification: string;
}

export const MATCH_TYPES: { label: string; value: MatchType; hint: string }[] = [
  { label: 'Exact match', value: 'exact', hint: 'Interchangeable in any context' },
  { label: 'Close match', value: 'close', hint: 'Interchangeable in some contexts' },
  { label: 'Broad match', value: 'broad', hint: 'The target is more general' },
  { label: 'Narrow match', value: 'narrow', hint: 'The target is more specific' },
  { label: 'Related match', value: 'related', hint: 'Associated, not equivalent' }
];

export function emptyMappingForm(): MappingForm {
  return { target_scheme: '', target_uri: '', target_label: '', match_type: 'exact', justification: '' };
}

export function mappingFormError(form: MappingForm): string | null {
  if (!form.target_scheme.trim()) return 'Name the target vocabulary (AGROVOC, Wikidata…).';
  if (!form.target_uri.trim()) return 'Paste the URI of the target concept.';
  if (!isHttpUrl(form.target_uri)) return 'The target URI must start with http:// or https://.';
  return null;
}

export function mappingBody(form: MappingForm): MappingInput {
  const body: MappingInput = { target_scheme: form.target_scheme.trim(), target_uri: form.target_uri.trim(), match_type: form.match_type };
  if (form.target_label.trim()) body.target_label = form.target_label.trim();
  if (form.justification.trim()) body.justification = form.justification.trim();
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
      rejectButtonStyleClass: 'btn-ghost',
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
