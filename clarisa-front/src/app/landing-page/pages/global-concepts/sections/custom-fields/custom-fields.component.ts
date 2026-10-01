import { Component, Input, OnChanges } from '@angular/core';
import { PublicCustomField, PublicFieldDef } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { conceptLink, ListsByCode, dateLabel, labelOf, safeHttpUrl } from '../../global-concepts.utils';

export type FieldKind = 'text' | 'long' | 'chips' | 'links' | 'url' | 'date';

export interface FieldView {
  code: string;
  label: string;
  kind: FieldKind;
  text: string;
  chips: string[];
  links: { term_id: number; label: string }[];
  url: string | null;
  ai: boolean;
}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === null || value === undefined || value === '' ? [] : [value]);

/** A list value may arrive as its code or as `{ value, label }`. */
const valueText = (value: unknown): string => {
  if (value && typeof value === 'object') {
    const v = value as { label?: unknown; value?: unknown };
    return String(v.label ?? v.value ?? '');
  }
  return value === null || value === undefined ? '' : String(value);
};

/**
 * Turns one public custom field into what the page draws, by its type
 * (contract-v2 § 2). Empty values drop out: a blank field is not shown.
 */
export function fieldView(field: PublicCustomField, ai: string[], lists: ListsByCode, defs: PublicFieldDef[]): FieldView | null {
  const base: FieldView = { code: field.code, label: field.label || field.code, kind: 'text', text: '', chips: [], links: [], url: null, ai: ai.includes(field.code) };
  const listCode = defs.find(d => d.code === field.code)?.list_code ?? null;
  const named = (value: unknown) => {
    const text = valueText(value);
    return listCode && typeof value === 'string' ? labelOf(lists, listCode, text) : text;
  };
  switch (field.type) {
    case 'multi_text':
    case 'list':
    case 'multi_list': {
      const chips = asArray(field.value).map(named).filter(Boolean);
      return chips.length ? { ...base, kind: 'chips', chips } : null;
    }
    case 'term_link': {
      const links = asArray(field.value)
        .map(v => v as { term_id?: unknown; preferred_label?: unknown })
        .filter(v => v && Number.isInteger(Number(v.term_id)) && Number(v.term_id) > 0)
        .map(v => ({ term_id: Number(v.term_id), label: String(v.preferred_label ?? `TERM ${v.term_id}`) }));
      return links.length ? { ...base, kind: 'links', links } : null;
    }
    case 'url': {
      const text = valueText(field.value).trim();
      return text ? { ...base, kind: 'url', text, url: safeHttpUrl(text) } : null;
    }
    case 'date': {
      const text = valueText(field.value).trim();
      return text ? { ...base, kind: 'date', text: dateLabel(text) } : null;
    }
    case 'long_text': {
      const text = valueText(field.value).trim();
      return text ? { ...base, kind: 'long', text } : null;
    }
    default: {
      const text = named(field.value).trim();
      return text ? { ...base, kind: 'text', text } : null;
    }
  }
}

/** "Additional information": the scheme's own metadata fields, in the back's order. */
@Component({
  selector: 'app-gc-custom-fields',
  templateUrl: './custom-fields.component.html',
  styleUrls: ['./custom-fields.component.scss'],
  host: { class: 'gc-kit' }
})
export class CustomFieldsComponent implements OnChanges {
  @Input() fields: PublicCustomField[] | null | undefined = [];
  @Input() aiFields: string[] = [];
  @Input() lists: ListsByCode = {};
  @Input() defs: PublicFieldDef[] = [];
  @Input() scheme = '';

  views: FieldView[] = [];

  ngOnChanges(): void {
    this.views = (this.fields ?? []).map(f => fieldView(f, this.aiFields ?? [], this.lists ?? {}, this.defs ?? [])).filter((v): v is FieldView => !!v);
  }

  link(termId: number): (string | number)[] {
    return conceptLink(this.scheme, termId);
  }
}
