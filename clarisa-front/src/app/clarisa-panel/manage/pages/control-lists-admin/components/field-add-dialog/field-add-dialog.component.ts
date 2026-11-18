import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { FieldRow, FieldTypeOption, ListDetail, ListRow, NewFieldBody } from '../../models/control-lists.models';
import { isValidCode, suggestCode } from '../../utils/code-suggest';
import { WriteDialogBase } from '../write-dialog.base';

@Component({
  selector: 'app-cl-field-add-dialog',
  templateUrl: './field-add-dialog.component.html'
})
export class FieldAddDialogComponent extends WriteDialogBase<FieldRow> {
  @Input() list: ListDetail | null = null;
  @Input() types: FieldTypeOption[] = [];
  /** Published lists of the same owner this list may relate to. */
  @Input() targets: ListRow[] = [];

  label = '';
  code = '';
  type: string | null = null;
  relationListId: number | null = null;
  isRequired = false;
  isUnique = false;
  isIndexed = false;
  private codeEdited = false;

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  protected override onOpen(): void {
    this.label = '';
    this.code = '';
    this.type = null;
    this.relationListId = null;
    this.isRequired = false;
    this.isUnique = false;
    this.isIndexed = false;
    this.codeEdited = false;
  }

  get isRelation(): boolean {
    return this.type === 'relation';
  }

  /** The back refuses a required field on a published list that already has records. */
  get requiredNote(): boolean {
    return !!this.list && this.list.status === 'published' && this.list.rows > 0;
  }

  get codeInvalid(): boolean {
    return this.code !== '' && !isValidCode(this.code);
  }

  get valid(): boolean {
    return this.label.trim() !== '' && isValidCode(this.code) && !!this.type && (!this.isRelation || this.relationListId !== null);
  }

  onLabelChange(): void {
    if (!this.codeEdited) this.code = suggestCode(this.label);
  }

  onCodeChange(): void {
    this.codeEdited = this.code !== '';
    if (!this.codeEdited) this.code = suggestCode(this.label);
  }

  submit(): void {
    if (this.saving || !this.valid || !this.list || !this.type) return;
    const listId = this.list.id;
    const body: NewFieldBody = {
      code: this.code,
      label: this.label.trim(),
      type: this.type,
      is_required: this.isRequired,
      is_unique: this.isUnique,
      is_indexed: this.isIndexed,
      ...(this.isRelation && this.relationListId !== null ? { relation_list_id: this.relationListId } : {}),
      request_id: this.requestId
    };
    this.write(
      () => this.api.addField(listId, body),
      field => this.success('Field added', `"${field.label}" was added to the list.`)
    );
  }
}
