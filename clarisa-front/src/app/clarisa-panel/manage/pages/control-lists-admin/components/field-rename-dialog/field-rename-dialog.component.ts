import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { FieldRow } from '../../models/control-lists.models';
import { codeProblem, isUsableCode } from '../../utils/code-suggest';
import { LIMITS } from '../../utils/limits';
import { WriteDialogBase } from '../write-dialog.base';

@Component({
  selector: 'app-cl-field-rename-dialog',
  templateUrl: './field-rename-dialog.component.html'
})
export class FieldRenameDialogComponent extends WriteDialogBase<FieldRow> {
  @Input() field: FieldRow | null = null;
  @Input() published = false;

  readonly limits = LIMITS;
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

  /** Why the code cannot be used (wrong shape, or a word the back keeps for itself), or `''`. */
  get codeError(): string {
    return codeProblem(this.code, 'field');
  }

  get codeInvalid(): boolean {
    return this.codeError !== '';
  }

  get valid(): boolean {
    return (
      !!this.field && this.label.trim() !== '' && isUsableCode(this.code, 'field') && (this.label.trim() !== this.field.label || this.codeChanged)
    );
  }

  /** The label or the code is not what the field has now. */
  protected override isDirty(): boolean {
    return !!this.field && (this.label !== this.field.label || this.code !== this.field.code);
  }

  submit(): void {
    if (this.saving || !this.valid || !this.field) return;
    const id = this.field.id;
    const change = { label: this.label.trim(), code: this.code };
    const body = { ...change, request_id: this.requestIdFor({ fieldId: id, ...change }) };
    this.write(
      () => this.api.renameField(id, body),
      field => this.success('Field renamed', `"${field.label}" was updated.`)
    );
  }
}
