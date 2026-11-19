import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { FieldImpact, FieldRow } from '../../models/control-lists.models';
import { readApiError } from '../../utils/api-error';
import { WriteDialogBase } from '../write-dialog.base';

@Component({
  selector: 'app-cl-field-delete-dialog',
  templateUrl: './field-delete-dialog.component.html'
})
export class FieldDeleteDialogComponent extends WriteDialogBase<unknown> {
  @Input() field: FieldRow | null = null;

  impact: FieldImpact | null = null;
  impactLoading = false;
  impactError: string | null = null;
  private impactSub?: Subscription;

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  protected override onOpen(): void {
    this.loadImpact();
  }

  /** «Try again» after the impact could not be read. */
  retryImpact(): void {
    this.loadImpact();
  }

  private loadImpact(): void {
    this.impactSub?.unsubscribe();
    this.impact = null;
    this.impactError = null;
    this.impactLoading = false;
    if (!this.field) return;
    this.impactLoading = true;
    this.impactSub = this.api.fieldImpact(this.field.id, 'delete').subscribe({
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

  override ngOnDestroy(): void {
    this.impactSub?.unsubscribe();
    super.ngOnDestroy();
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.field && !!this.impact && !this.impactLoading;
  }

  submit(): void {
    if (!this.canSubmit || !this.field) return;
    const { id, label } = this.field;
    this.write(
      () => this.api.deleteField(id, this.requestId),
      () => this.success('Field deleted', `"${label}" was removed from the list.`)
    );
  }
}
