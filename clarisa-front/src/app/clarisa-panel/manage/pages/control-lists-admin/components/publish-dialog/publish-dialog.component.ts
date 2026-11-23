import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { ListDetail, ListRow } from '../../models/control-lists.models';
import { WriteDialogBase } from '../write-dialog.base';

@Component({
  selector: 'app-cl-publish-dialog',
  templateUrl: './publish-dialog.component.html'
})
export class PublishDialogComponent extends WriteDialogBase<ListRow> {
  @Input() list: ListDetail | null = null;

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  get address(): string {
    return this.list ? this.api.publicUrl(this.list.code) : '';
  }

  submit(): void {
    if (this.saving || !this.list) return;
    const { id, name } = this.list;
    this.write(
      () => this.api.publish(id, this.requestIdFor({ publish: id })),
      () => this.success('List published', `"${name}" is now public at its address.`)
    );
  }
}
