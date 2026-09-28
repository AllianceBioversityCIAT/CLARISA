import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { CustomField, CustomFieldType, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { FIELD_TYPE_LABELS, needsList } from '../../utils/custom-fields';
import { emptyFieldForm, fieldCreateBody, FieldForm, fieldFormError, fieldFormFrom, fieldPatchBody, isLocked, suggestCode } from '../../utils/setup-fields';

export interface FieldRow {
  field: CustomField;
  code: string;
  label: string;
  typeLabel: string;
  list_code: string;
  required: number;
  is_public: number;
  sort: number;
  is_active: number;
}

/** Definitions of the scheme's own metadata fields (contract v2 § 2). */
@Component({
  selector: 'app-gc-setup-fields',
  templateUrl: './gc-setup-fields.component.html',
  styleUrls: ['./gc-setup-fields.component.scss']
})
export class GcSetupFieldsComponent implements OnInit, OnChanges {
  @Input() scheme = 'meliaf';
  /** List codes the list types can point to. */
  @Input() listCodes: string[] = [];

  loading = false;
  loadError: string | null = null;
  fields: CustomField[] = [];
  rows: FieldRow[] = [];

  dialogVisible = false;
  form: FieldForm = emptyFieldForm();
  private original: FieldForm | null = null;
  private codeTouched = false;
  saving = false;
  saveError: string | null = null;

  readonly typeOptions = (Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map(value => ({ value, label: FIELD_TYPE_LABELS[value] }));

  constructor(private readonly _api: GlobalConceptsApiService, private readonly _messageService: MessageService) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scheme'] && !changes['scheme'].firstChange) this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = null;
    this._api.fields(this.scheme).subscribe({
      next: fields => {
        this.loading = false;
        this.fields = Array.isArray(fields) ? fields : [];
        this.rows = this.fields.map(field => ({
          field,
          code: field.code,
          label: field.label,
          typeLabel: FIELD_TYPE_LABELS[field.type] ?? field.type,
          list_code: field.list_code ?? '',
          required: field.required ? 1 : 0,
          is_public: field.is_public ? 1 : 0,
          sort: field.sort ?? 0,
          is_active: field.is_active ? 1 : 0
        }));
      },
      error: error => {
        this.loading = false;
        this.loadError = apiErrorMessage(error, 'The custom fields could not be loaded');
      }
    });
  }

  get listOptions(): { label: string; value: string }[] {
    return this.listCodes.map(code => ({ label: code, value: code }));
  }

  get editing(): boolean {
    return this.form.id !== null;
  }

  locked(key: 'code' | 'type' | 'list_code'): boolean {
    return isLocked(this.form, key);
  }

  needsList(type: CustomFieldType): boolean {
    return needsList(type);
  }

  typeLabel(type: CustomFieldType): string {
    return FIELD_TYPE_LABELS[type] ?? type;
  }

  openCreate(): void {
    const nextSort = this.fields.length ? Math.max(...this.fields.map(field => field.sort ?? 0)) + 1 : 0;
    this.form = emptyFieldForm(nextSort);
    this.original = null;
    this.codeTouched = false;
    this.saveError = null;
    this.dialogVisible = true;
  }

  openEdit(field: CustomField): void {
    this.form = fieldFormFrom(field);
    this.original = fieldFormFrom(field);
    this.saveError = null;
    this.dialogVisible = true;
  }

  onLabelChange(label: string): void {
    if (!this.editing && !this.codeTouched) this.form.code = suggestCode(label);
  }

  onCodeChange(): void {
    this.codeTouched = true;
  }

  get formError(): string | null {
    return fieldFormError(
      this.form,
      this.fields.filter(field => field.id !== this.form.id)
    );
  }

  get dirty(): boolean {
    return !this.original || Object.keys(fieldPatchBody(this.form, this.original)).length > 0;
  }

  save(): void {
    if (this.saving || this.formError) return;
    const original = this.original;
    if (original && !this.dirty) {
      this.dialogVisible = false;
      return;
    }
    this.saving = true;
    this.saveError = null;
    const request = original
      ? this._api.updateField(this.scheme, this.form.id as number, fieldPatchBody(this.form, original))
      : this._api.createField(this.scheme, fieldCreateBody(this.form));
    request.subscribe({
      next: field => {
        this.saving = false;
        this.dialogVisible = false;
        this._messageService.add({
          severity: 'success',
          summary: original ? 'Field updated' : 'Field created',
          detail: `${field?.label ?? this.form.label} (${field?.code ?? this.form.code}) — it shows in every concept now.`
        });
        this.load();
      },
      error: error => {
        this.saving = false;
        this.saveError = apiErrorMessage(error, 'The field could not be saved');
      }
    });
  }
}
