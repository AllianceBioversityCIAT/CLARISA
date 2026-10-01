import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  AdminConceptDetail,
  ConceptRef,
  GlobalConceptsApiService,
  RelationKind
} from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { ConceptOption } from '../gc-concept-picker/gc-concept-picker.component';
import { FIELD_INFO } from '../../utils/field-info';

/**
 * Broader and related links, each written on its own (add / remove answer the
 * updated concept). Narrower terms are the other side of someone's broader
 * link, so they are shown but edited from the child.
 */
@Component({
  selector: 'app-gc-relations-editor',
  templateUrl: './gc-relations-editor.component.html',
  styleUrls: ['./gc-relations-editor.component.scss']
})
export class GcRelationsEditorComponent {
  @Input() scheme = 'concepts';
  @Input() concept: AdminConceptDetail | null = null;
  @Input() options: ConceptOption[] = [];
  @Output() updated = new EventEmitter<AdminConceptDetail>();

  /** `kind:term_id` of the write in flight; one at a time, so a double click never sends two. */
  busy: string | null = null;
  error: { kind: RelationKind; message: string } | null = null;

  readonly info = FIELD_INFO.relation;
  readonly sections: { kind: RelationKind; title: string; hint: string; empty: string }[] = [
    {
      kind: 'broader',
      title: 'Broader concepts',
      hint: 'The more general concepts this one belongs to. A loop (A under B under A) is refused.',
      empty: 'A top concept: nothing above it.'
    },
    {
      kind: 'related',
      title: 'Related concepts',
      hint: 'Associated concepts that are neither broader nor narrower. The link shows on both.',
      empty: 'No related concepts yet.'
    }
  ];

  constructor(private readonly _api: GlobalConceptsApiService, private readonly _messageService: MessageService) {}

  refs(kind: RelationKind): ConceptRef[] {
    return (kind === 'broader' ? this.concept?.broader_terms : this.concept?.related_terms) ?? [];
  }

  get narrower(): ConceptRef[] {
    return this.concept?.narrower_terms ?? [];
  }

  /** Itself and whatever is already linked with this kind. */
  excluded(kind: RelationKind): number[] {
    return [this.concept?.term_id ?? 0, ...this.refs(kind).map(ref => ref.term_id)];
  }

  add(kind: RelationKind, target: ConceptOption): void {
    this.write(kind, target.term_id, target.preferred_label, false);
  }

  remove(kind: RelationKind, target: ConceptRef): void {
    this.write(kind, target.term_id, target.preferred_label, true);
  }

  isBusy(kind: RelationKind, termId: number): boolean {
    return this.busy === `${kind}:${termId}`;
  }

  private write(kind: RelationKind, termId: number, label: string, removing: boolean): void {
    const concept = this.concept;
    if (!concept || this.busy || termId === concept.term_id) return;
    this.busy = `${kind}:${termId}`;
    this.error = null;
    const body = { kind, target_term_id: termId };
    const request = removing ? this._api.removeRelation(this.scheme, concept.term_id, body) : this._api.addRelation(this.scheme, concept.term_id, body);
    request.subscribe({
      next: updated => {
        this.busy = null;
        this._messageService.add({
          severity: 'success',
          summary: removing ? 'Link removed' : 'Link added',
          detail: `${label} ${removing ? 'is no longer' : 'is now'} ${kind === 'broader' ? 'broader than' : 'related to'} “${concept.preferred_label}”.`
        });
        this.updated.emit(updated);
      },
      error: error => {
        this.busy = null;
        this.error = { kind, message: apiErrorMessage(error, removing ? 'The link could not be removed' : 'The link could not be added') };
      }
    });
  }
}
