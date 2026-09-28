import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { AdminConceptDetail, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { LABEL_KIND_OPTIONS, LabelRow, labelRowsFrom, labelsError, labelsPayload, sameLabels } from '../../utils/concept-editor';

/** Every label but the main preferred one, edited as a list and saved as one set (the PUT replaces it). */
@Component({
  selector: 'app-gc-labels-editor',
  templateUrl: './gc-labels-editor.component.html',
  styleUrls: ['./gc-labels-editor.component.scss']
})
export class GcLabelsEditorComponent implements OnChanges {
  @Input() scheme = 'meliaf';
  @Input() concept: AdminConceptDetail | null = null;
  @Output() updated = new EventEmitter<AdminConceptDetail>();

  readonly kindOptions = LABEL_KIND_OPTIONS;
  rows: LabelRow[] = [];
  private original: LabelRow[] = [];
  saving = false;
  saveError: string | null = null;

  constructor(private readonly _api: GlobalConceptsApiService, private readonly _messageService: MessageService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['concept'] && this.concept && !this.saving) this.reset();
  }

  reset(): void {
    this.rows = this.concept ? labelRowsFrom(this.concept) : [];
    this.original = this.rows.map(row => ({ ...row }));
    this.saveError = null;
  }

  add(): void {
    this.rows = [...this.rows, { label: '', kind: 'alt', language: this.concept?.language ?? 'en', discouraged: false }];
  }

  remove(index: number): void {
    this.rows = this.rows.filter((_, i) => i !== index);
  }

  get error(): string | null {
    return labelsError(this.rows);
  }

  get dirty(): boolean {
    return !sameLabels(this.rows, this.original);
  }

  save(): void {
    const concept = this.concept;
    if (!concept || this.saving || this.error || !this.dirty) return;
    this.saving = true;
    this.saveError = null;
    this._api.setLabels(this.scheme, concept.term_id, labelsPayload(this.rows)).subscribe({
      next: updated => {
        this.saving = false;
        this._messageService.add({ severity: 'success', summary: 'Labels saved', detail: `${labelsPayload(this.rows).length} label(s) on “${concept.preferred_label}”.` });
        this.updated.emit(updated);
      },
      error: error => {
        this.saving = false;
        this.saveError = apiErrorMessage(error, 'The labels could not be saved');
      }
    });
  }

  trackRow(index: number): number {
    return index;
  }
}
