import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { ListRecord } from '../../models/control-lists.models';
import { WriteDialogBase } from '../write-dialog.base';
import { REASON_MAX } from '../record-dialog/record-dialog.component';

/** Deactivates a record (DELETE) or brings it back (PATCH `is_active: true`), with an optional reason. */
@Component({
  selector: 'app-cl-record-status-dialog',
  templateUrl: './record-status-dialog.component.html'
})
export class RecordStatusDialogComponent extends WriteDialogBase<ListRecord> {
  @Input() code = '';
  @Input() record: ListRecord | null = null;
  @Input() mode: 'deactivate' | 'reactivate' = 'deactivate';

  readonly reasonMax = REASON_MAX;
  reason = '';

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  protected override onOpen(): void {
    this.reason = '';
  }

  get deactivating(): boolean {
    return this.mode === 'deactivate';
  }

  submit(): void {
    if (this.saving || !this.record) return;
    const id = this.record.id;
    const reason = this.reason.trim();
    if (this.deactivating) {
      this.write(
        () => this.api.deactivateRecord(this.code, id, reason || undefined),
        () => this.success('Record deactivated', `Record #${id} left the public list.`)
      );
      return;
    }
    this.write(
      () => this.api.updateRecord(this.code, id, { is_active: true, ...(reason ? { modification_justification: reason } : {}) }),
      () => this.success('Record reactivated', `Record #${id} is back in the public list.`)
    );
  }
}
