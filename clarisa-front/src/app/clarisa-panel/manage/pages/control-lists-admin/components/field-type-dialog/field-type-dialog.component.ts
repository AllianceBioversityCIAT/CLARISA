import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { FieldImpact, FieldRow, FieldTypeOption } from '../../models/control-lists.models';
import { ApiErrorInfo, readApiError } from '../../utils/api-error';
import { WriteDialogBase } from '../write-dialog.base';

@Component({
  selector: 'app-cl-field-type-dialog',
  templateUrl: './field-type-dialog.component.html'
})
export class FieldTypeDialogComponent extends WriteDialogBase<FieldRow> {
  @Input() field: FieldRow | null = null;
  @Input() types: FieldTypeOption[] = [];

  type: string | null = null;
  impact: FieldImpact | null = null;
  impactLoading = false;
  impactError: string | null = null;
  /** The back answered 409 with a new count: the user must confirm that number. */
  reconfirm = false;
  private impactSub?: Subscription;

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  get options(): FieldTypeOption[] {
    // A field does not become a relation by changing type; the back refuses it.
    return this.types.filter(t => t.value !== this.field?.type && t.value !== 'relation');
  }

  protected override onOpen(): void {
    this.impactSub?.unsubscribe();
    this.type = null;
    this.impact = null;
    this.impactError = null;
    this.impactLoading = false;
    this.reconfirm = false;
  }

  override ngOnDestroy(): void {
    this.impactSub?.unsubscribe();
    super.ngOnDestroy();
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.field && !!this.type && !!this.impact && !this.impactLoading;
  }

  onTypeChange(): void {
    this.impactSub?.unsubscribe();
    this.impact = null;
    this.impactError = null;
    this.reconfirm = false;
    this.error = null;
    if (!this.field || !this.type) return;
    this.impactLoading = true;
    this.impactSub = this.api.fieldImpact(this.field.id, 'type', this.type).subscribe({
      next: impact => {
        this.impact = impact;
        this.impactLoading = false;
      },
      error: err => {
        this.impactError = readApiError(err).message;
        this.impactLoading = false;
      }
    });
  }

  protected override onWriteError(info: ApiErrorInfo): boolean {
    if (info.status === 409 && info.affected !== null && this.impact) {
      // The data changed since the preview: show the new count and let the user confirm it.
      this.impact = { ...this.impact, affected: info.affected, message: info.message };
      this.reconfirm = true;
      return true;
    }
    return false;
  }

  submit(): void {
    if (!this.canSubmit || !this.field || !this.type || !this.impact) return;
    const id = this.field.id;
    const body = { type: this.type, confirm_affected: this.impact.affected, request_id: this.requestId };
    this.write(
      () => this.api.changeType(id, body),
      field => this.success('Type changed', `"${field.label}" is now ${field.type_label ?? field.type}.`)
    );
  }
}
