import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { ListDeleteImpact, ListDetail } from '../../models/control-lists.models';
import { readApiError } from '../../utils/api-error';
import { WriteDialogBase } from '../write-dialog.base';

@Component({
  selector: 'app-cl-delete-list-dialog',
  templateUrl: './delete-list-dialog.component.html'
})
export class DeleteListDialogComponent extends WriteDialogBase<unknown> {
  @Input() list: ListDetail | null = null;

  impact: ListDeleteImpact | null = null;
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
    this.impactSub?.unsubscribe();
    this.impact = null;
    this.impactError = null;
    if (!this.list) return;
    this.impactLoading = true;
    this.impactSub = this.api.deleteImpact(this.list.id).subscribe({
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

  /** Other lists still point at this one: the back would refuse, so there is nothing to confirm. */
  get blocked(): boolean {
    return !!this.impact && this.impact.dependents.length > 0;
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.list && !!this.impact && !this.impactLoading && !this.blocked;
  }

  submit(): void {
    if (!this.canSubmit || !this.list) return;
    const { id, name } = this.list;
    this.write(
      () => this.api.deleteList(id, this.requestId),
      () => this.success('List deleted', `"${name}" and its table were removed.`)
    );
  }
}
