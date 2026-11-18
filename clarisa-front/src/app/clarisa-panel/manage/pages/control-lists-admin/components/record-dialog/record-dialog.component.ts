import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { FieldRow, ListRecord } from '../../models/control-lists.models';
import { buildChangedBody, buildCreateBody, FormValues, initialValues, isOn, recordIsActive, recordLabel } from '../../utils/record-values';
import { WriteDialogBase } from '../write-dialog.base';

export interface RelationOption {
  value: number;
  label: string;
}

export const REASON_MAX = 500;

@Component({
  selector: 'app-cl-record-dialog',
  templateUrl: './record-dialog.component.html'
})
export class RecordDialogComponent extends WriteDialogBase<ListRecord> {
  @Input() code = '';
  /** Published fields, in position order. */
  @Input() fields: FieldRow[] = [];
  /** `null` = «New record». */
  @Input() record: ListRecord | null = null;
  /** Records of each related list by its code; `null` when that list could not be read. */
  @Input() related: Record<string, ListRecord[] | null> = {};

  readonly reasonMax = REASON_MAX;
  values: FormValues = {};
  reason = '';
  options: Record<string, RelationOption[]> = {};
  private initial: FormValues = {};

  readonly isOn = isOn;

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  get editing(): boolean {
    return this.record !== null;
  }

  protected override onOpen(): void {
    this.initial = initialValues(this.fields, this.record ?? undefined);
    this.values = { ...this.initial };
    this.reason = '';
    this.options = {};
    for (const f of this.fields) {
      if (f.type !== 'relation' || !f.relation_code) continue;
      const rows = this.related[f.relation_code] ?? [];
      const current = this.initial[f.code];
      // Active records, plus the one currently chosen even if it was deactivated since.
      this.options[f.code] = rows.filter(r => recordIsActive(r) || r.id === current).map(r => ({ value: r.id, label: recordLabel(r) }));
      if (typeof current === 'number' && !this.options[f.code].some(o => o.value === current)) {
        this.options[f.code].push({ value: current, label: `#${current}` });
      }
    }
  }

  relationFailed(field: FieldRow): boolean {
    return !!field.relation_code && this.related[field.relation_code] === null;
  }

  get changed(): Record<string, unknown> {
    return buildChangedBody(this.fields, this.initial, this.values);
  }

  get hasChanges(): boolean {
    return Object.keys(this.changed).length > 0;
  }

  get canSubmit(): boolean {
    return !this.saving && (!this.editing || this.hasChanges);
  }

  submit(): void {
    if (!this.canSubmit) return;
    const reason = this.reason.trim();
    if (this.record) {
      const id = this.record.id;
      const body = { ...this.changed, ...(reason ? { modification_justification: reason } : {}) };
      this.write(
        () => this.api.updateRecord(this.code, id, body),
        () => this.success('Record saved', `Record #${id} was updated.`)
      );
      return;
    }
    const body = { ...buildCreateBody(this.fields, this.values), request_id: this.requestId };
    this.write(
      () => this.api.createRecord(this.code, body),
      created => this.success('Record created', `Record #${created.id} was added.`)
    );
  }
}
