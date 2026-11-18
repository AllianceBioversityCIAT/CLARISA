import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { FieldRow } from '../../models/control-lists.models';
import { isValidCode } from '../../utils/code-suggest';
import { WriteDialogBase } from '../write-dialog.base';

@Component({
  selector: 'app-cl-field-rename-dialog',
  templateUrl: './field-rename-dialog.component.html'
})
export class FieldRenameDialogComponent extends WriteDialogBase<FieldRow> {
  @Input() field: FieldRow | null = null;
  @Input() published = false;

  label = '';
  code = '';

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  protected override onOpen(): void {
    this.label = this.field?.label ?? '';
    this.code = this.field?.code ?? '';
  }

  get codeChanged(): boolean {
    return !!this.field && this.code !== this.field.code;
  }

  get codeInvalid(): boolean {
    return this.code !== '' && !isValidCode(this.code);
  }

  get valid(): boolean {
    return !!this.field && this.label.trim() !== '' && isValidCode(this.code) && (this.label.trim() !== this.field.label || this.codeChanged);
  }

  submit(): void {
    if (this.saving || !this.valid || !this.field) return;
    const id = this.field.id;
    const body = { label: this.label.trim(), code: this.code, request_id: this.requestId };
    this.write(
      () => this.api.renameField(id, body),
      field => this.success('Field renamed', `"${field.label}" was updated.`)
    );
  }
}
