import { Component, Input } from '@angular/core';
import { CustomField } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { controlFor, CustomControl, CustomValue } from '../../utils/custom-fields';
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
  }

  unlink(field: CustomField, termId: number): void {
    this.values[field.code] = ((this.values[field.code] as number[]) ?? []).filter(id => id !== termId);
  }

  inputId(field: CustomField): string {
    return `gc-x-${field.code}`;
  }

  trackField(_: number, field: CustomField): string {
    return field.code;
  }
}
