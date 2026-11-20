import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { ListRow } from '../../models/control-lists.models';
import { LIMITS } from '../../utils/limits';
import { WriteDialogBase } from '../write-dialog.base';

/** «Edit list details»: the name and the description. The code is the public address and stays. */
@Component({
  selector: 'app-cl-list-edit-dialog',
  templateUrl: './list-edit-dialog.component.html',
  styleUrls: ['./list-edit-dialog.component.scss']
})
export class ListEditDialogComponent extends WriteDialogBase<ListRow> {
  @Input() list: ListRow | null = null;

  readonly limits = LIMITS;
  name = '';
  description = '';

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  protected override onOpen(): void {
    this.name = this.list?.name ?? '';
    this.description = this.list?.description ?? '';
  }

  /** What the back stores for the description: trimmed, `null` when empty. */
  private get cleanDescription(): string | null {
    const d = this.description.trim();
    return d === '' ? null : d;
  }

  /** The name or the description is not what the list has now (spaces around them do not count). */
  get changed(): boolean {
    if (!this.list) return false;
    return this.name.trim() !== this.list.name || this.cleanDescription !== ((this.list.description ?? '').trim() || null);
  }

  get valid(): boolean {
    return !!this.list && this.name.trim() !== '' && this.changed;
  }

  protected override isDirty(): boolean {
    return this.changed;
  }

  submit(): void {
    if (this.saving || !this.valid || !this.list) return;
    const id = this.list.id;
    const body = { name: this.name.trim(), description: this.cleanDescription };
    this.write(
      () => this.api.updateList(id, body),
      list => this.success('List updated', `"${list?.name ?? body.name}" was saved.`)
    );
  }
}
