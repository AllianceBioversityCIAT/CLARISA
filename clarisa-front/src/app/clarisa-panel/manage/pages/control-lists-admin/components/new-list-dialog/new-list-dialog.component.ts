import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { ListRow, OwnerRole } from '../../models/control-lists.models';
import { isValidCode, suggestCode } from '../../utils/code-suggest';
import { WriteDialogBase } from '../write-dialog.base';

@Component({
  selector: 'app-cl-new-list-dialog',
  templateUrl: './new-list-dialog.component.html'
})
export class NewListDialogComponent extends WriteDialogBase<ListRow> {
  @Input() owners: OwnerRole[] = [];

  name = '';
  code = '';
  description = '';
  ownerId: number | null = null;
  /** Once the user types in the code, it stops following the name. */
  private codeEdited = false;

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  protected override onOpen(): void {
    this.name = '';
    this.code = '';
    this.description = '';
    this.codeEdited = false;
    this.ownerId = this.owners.length === 1 ? this.owners[0].id : null;
  }

  get singleOwner(): OwnerRole | null {
    return this.owners.length === 1 ? this.owners[0] : null;
  }

  get codeInvalid(): boolean {
    return this.code !== '' && !isValidCode(this.code);
  }

  get valid(): boolean {
    return this.name.trim() !== '' && isValidCode(this.code);
  }

  get address(): string {
    return this.api.publicUrl(this.code || '<code>');
  }

  onNameChange(): void {
    if (!this.codeEdited) this.code = suggestCode(this.name);
  }

  onCodeChange(): void {
    // Clearing the code hands it back to the name.
    this.codeEdited = this.code !== '';
    if (!this.codeEdited) this.code = suggestCode(this.name);
  }

  submit(): void {
    if (this.saving || !this.valid) return;
    const description = this.description.trim();
    this.write(
      () =>
        this.api.createList({
          code: this.code,
          name: this.name.trim(),
          ...(description ? { description } : {}),
          ...(this.ownerId !== null ? { owner_role_id: this.ownerId } : {})
        }),
      list => this.success('List created', `"${list.name}" is a draft. Add its fields and publish it.`)
    );
  }
}
