import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CustomField } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { controlFor, CustomControl, CustomValue, FIELD_TYPE_LABELS } from '../../utils/custom-fields';
import { ListOption } from '../../utils/list-values';
import { ConceptOption } from '../gc-concept-picker/gc-concept-picker.component';

/**
 * One control per custom field definition, bound to `values[code]`. It only
 * draws: the dialog owns the values, the validation and the write.
 */
@Component({
  selector: 'app-gc-custom-fields-form',
  templateUrl: './gc-custom-fields-form.component.html',
  styleUrls: ['./gc-custom-fields-form.component.scss']
})
export class GcCustomFieldsFormComponent {
  @Input() fields: CustomField[] = [];
  @Input() values: Record<string, CustomValue> = {};
  @Input() lists: Record<string, ListOption[]> = {};
  @Input() conceptOptions: ConceptOption[] = [];
  @Input() selfTermId: number | null = null;
  @Input() disabled = false;
  /** A value the PERSON changed (control input, link, unlink); the dialog logs it for the assistant. */
  @Output() edited = new EventEmitter<{ code: string; value: CustomValue }>();

  control(field: CustomField): CustomControl {
    return controlFor(field.type);
  }

  optionsFor(field: CustomField): ListOption[] {
    return field.list_code ? this.lists[field.list_code] ?? [] : [];
  }

  linked(field: CustomField): ConceptOption[] {
    const ids = (this.values[field.code] as number[]) ?? [];
    return ids.map(id => this.conceptOptions.find(option => option.term_id === id) ?? { term_id: id, preferred_label: `TERM ${id}` });
  }

  excluded(field: CustomField): number[] {
    return [this.selfTermId ?? 0, ...(((this.values[field.code] as number[]) ?? []) as number[])];
  }

  link(field: CustomField, option: ConceptOption): void {
    const ids = ((this.values[field.code] as number[]) ?? []).filter(id => id !== option.term_id);
    this.values[field.code] = [...ids, option.term_id];
    this.edited.emit({ code: field.code, value: this.values[field.code] });
  }

  unlink(field: CustomField, termId: number): void {
    this.values[field.code] = ((this.values[field.code] as number[]) ?? []).filter(id => id !== termId);
    this.edited.emit({ code: field.code, value: this.values[field.code] });
  }

  /**
   * Text of the (i) next to the label: the help the admin wrote in Setup, or,
   * when there is none, what kind of value the field takes and where it lives.
   */
  info(field: CustomField): string {
    const help = (field.help ?? '').trim();
    if (help) return help;
    const kind = FIELD_TYPE_LABELS[field.type] ?? field.type;
    const visibility = field.is_public ? 'Published with the concept' : 'Internal: never published';
    return `Custom field of this scheme (${kind.toLowerCase()}), defined in Setup → Custom fields. ${visibility}. Imports read it from the column x:${field.code}.`;
  }

  inputId(field: CustomField): string {
    return `gc-x-${field.code}`;
  }

  trackField(_: number, field: CustomField): string {
    return field.code;
  }
}
