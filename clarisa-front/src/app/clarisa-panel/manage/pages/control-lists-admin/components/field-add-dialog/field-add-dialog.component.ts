import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { FieldRow, FieldTypeOption, ListDetail, ListRow, NewFieldBody } from '../../models/control-lists.models';
import { isValidCode, suggestCode } from '../../utils/code-suggest';
import { freeCode, optionsProblem, parseOptions, TypeChoice, typeChoices } from '../../utils/field-types';
import { FieldTypePickerComponent } from '../field-type-picker/field-type-picker.component';
import { WriteDialogBase } from '../write-dialog.base';

/** Where the options of an «Options» field come from. */
export type OptionsSource = 'new' | 'existing';

const MAX_LIST_NAME = 150;

@Component({
  selector: 'app-cl-field-add-dialog',
  templateUrl: './field-add-dialog.component.html',
  styleUrls: ['./field-add-dialog.component.scss']
})
export class FieldAddDialogComponent extends WriteDialogBase<FieldRow> {
  @Input() list: ListDetail | null = null;
  @Input() types: FieldTypeOption[] = [];
  /** Published lists of the same owner this list may relate to. */
  @Input() targets: ListRow[] = [];
  /** Codes of the lists this user sees: a new options list needs one that is free. */
  @Input() takenCodes: string[] = [];

  @ViewChild('changeType') private changeType?: ElementRef<HTMLButtonElement>;
  @ViewChild(FieldTypePickerComponent) private picker?: FieldTypePickerComponent;

  label = '';
  code = '';
  codeOpen = false;
  type: string | null = null;
  /** The whole picker shows until a type is picked; then only the pick, with the way back. */
  typeOpen = true;
  isRequired = false;
  isUnique = false;
  isIndexed = false;
  private codeEdited = false;

  source: OptionsSource = 'new';
  relationListId: number | null = null;
  optionsText = '';
  optionsName = '';
  optionsCode = '';
  optionsOpen = false;
  private optionsNameEdited = false;
  private optionsCodeEdited = false;

  constructor(
    private api: ControlListsApiService,
    toast: MessageService
  ) {
    super(toast);
  }

  protected override onOpen(): void {
    this.label = '';
    this.code = '';
    this.codeOpen = false;
    this.type = null;
    this.typeOpen = true;
    this.isRequired = false;
    this.isUnique = false;
    this.isIndexed = false;
    this.codeEdited = false;
    this.source = 'new';
    this.relationListId = null;
    this.optionsText = '';
    this.optionsName = '';
    this.optionsCode = '';
    this.optionsOpen = false;
    this.optionsNameEdited = false;
    this.optionsCodeEdited = false;
  }

  get chosenType(): TypeChoice | null {
    return typeChoices(this.types).find(c => c.value === this.type) ?? null;
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

  get options(): string[] {
    return parseOptions(this.optionsText);
  }

  get optionsError(): string {
    return optionsProblem(this.options);
  }

  get optionsCodeTaken(): boolean {
    return this.optionsCode !== '' && this.takenCodes.includes(this.optionsCode);
  }

  get optionsCodeInvalid(): boolean {
    return this.optionsCode !== '' && !isValidCode(this.optionsCode);
  }

  private get optionsReady(): boolean {
    return this.options.length > 0 && !this.optionsError && this.optionsName.trim() !== '' && isValidCode(this.optionsCode) && !this.optionsCodeTaken;
  }

  get valid(): boolean {
    if (this.label.trim() === '' || !isValidCode(this.code) || !this.type) return false;
    if (!this.isRelation) return true;
    return this.source === 'new' ? this.optionsReady : this.relationListId !== null;
  }

  onLabelChange(): void {
    if (!this.codeEdited) this.code = suggestCode(this.label);
    // A label with no letters gives no code: the person has to write one.
    if (this.label.trim() !== '' && !isValidCode(this.code)) this.codeOpen = true;
    this.suggestOptionsList();
  }

  onCodeChange(): void {
    this.codeEdited = this.code !== '';
    if (!this.codeEdited) this.code = suggestCode(this.label);
    this.suggestOptionsList();
  }

  onTypeChange(type: string): void {
    this.type = type;
    if (this.isRelation) {
      // Writing the options here is the short way; the existing lists stay one click away.
      this.suggestOptionsList();
    }
  }

  /** The type was picked on purpose: the picker folds into that one row, and the keyboard stays on it. */
  onTypePicked(): void {
    this.typeOpen = false;
    setTimeout(() => this.changeType?.nativeElement.focus());
  }

  /** Back to the whole picker, with the keyboard on the type that was chosen. */
  reopenTypes(): void {
    this.typeOpen = true;
    setTimeout(() => this.picker?.focusChosen());
  }

  setSource(source: OptionsSource): void {
    this.source = source;
  }

  onOptionsNameChange(): void {
    this.optionsNameEdited = this.optionsName.trim() !== '';
    if (!this.optionsNameEdited) this.suggestOptionsList();
  }

  onOptionsCodeChange(): void {
    this.optionsCodeEdited = this.optionsCode !== '';
    if (!this.optionsCodeEdited) this.suggestOptionsList();
  }

  /** Name and code of the list the options are saved as, from the parent list and the field. */
  private suggestOptionsList(): void {
    if (!this.list) return;
    const label = this.label.trim();
    if (!this.optionsNameEdited) this.optionsName = label ? `${this.list.name} – ${label}`.slice(0, MAX_LIST_NAME) : '';
    if (!this.optionsCodeEdited) {
      this.optionsCode = this.code ? freeCode(suggestCode(`${this.list.code}_${this.code}`), this.takenCodes) : '';
    }
  }

  submit(): void {
    if (this.saving || !this.valid || !this.list || !this.type) return;
    const listId = this.list.id;
    const withOptions = this.isRelation && this.source === 'new';
    const options = this.options;
    const body: NewFieldBody = {
      code: this.code,
      label: this.label.trim(),
      type: this.type,
      is_required: this.isRequired,
      is_unique: this.isUnique,
      is_indexed: this.isIndexed,
      ...(this.isRelation && !withOptions && this.relationListId !== null ? { relation_list_id: this.relationListId } : {}),
      ...(withOptions ? { options_list: { code: this.optionsCode, name: this.optionsName.trim(), options } } : {}),
      request_id: this.requestId
    };
    this.write(
      () => this.api.addField(listId, body),
      field =>
        this.success(
          'Field added',
          withOptions
            ? `"${field.label}" was added with its ${options.length} ${options.length === 1 ? 'option' : 'options'}.`
            : `"${field.label}" was added to the list.`
        )
    );
  }
}
