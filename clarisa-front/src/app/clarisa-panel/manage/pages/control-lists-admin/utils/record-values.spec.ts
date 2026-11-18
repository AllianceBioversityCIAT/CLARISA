import { FieldRow, ListRecord } from '../models/control-lists.models';
import {
  buildChangedBody,
  buildCreateBody,
  initialValues,
  publishedFields,
  recordIsActive,
  recordLabel,
  toApiValue,
  toFormValue
} from './record-values';

const field = (type: string, over: Partial<FieldRow> = {}): FieldRow =>
  ({
    id: 1,
    list_id: 1,
    code: type,
    label: type,
    type,
    column_name: type,
    is_required: 0,
    is_unique: 0,
    is_indexed: 0,
    relation_list_id: null,
    position: 1,
    status: 'published',
    type_label: type,
    relation_name: null,
    relation_code: null,
    created_at: '',
    updated_at: '',
    ...over
  }) as FieldRow;

describe('record values', () => {
  describe('toApiValue', () => {
    it('keeps text as typed and sends empty text as null', () => {
      expect(toApiValue(field('text'), ' Maize ')).toBe(' Maize ');
      expect(toApiValue(field('text'), '')).toBeNull();
      expect(toApiValue(field('long_text'), '   ')).toBeNull();
      expect(toApiValue(field('url'), 'https://x.org')).toBe('https://x.org');
      expect(toApiValue(field('email'), 'a@b.co')).toBe('a@b.co');
    });

    it('sends numbers as numbers, zero included', () => {
      expect(toApiValue(field('integer'), '42')).toBe(42);
      expect(toApiValue(field('integer'), '0')).toBe(0);
      expect(toApiValue(field('integer'), '-7')).toBe(-7);
      expect(toApiValue(field('decimal'), '12.5')).toBe(12.5);
      expect(toApiValue(field('decimal'), '0')).toBe(0);
      expect(toApiValue(field('integer'), '')).toBeNull();
    });

    it('sends what is not a plain number as typed, so the back explains', () => {
      expect(toApiValue(field('integer'), '12.5')).toBe('12.5');
      expect(toApiValue(field('decimal'), '12,5')).toBe('12,5');
      expect(toApiValue(field('integer'), '9007199254740993')).toBe('9007199254740993');
    });

    it('handles the boolean as a switch when required and tri-state when optional', () => {
      expect(toApiValue(field('boolean', { is_required: 1 }), false)).toBe(false);
      expect(toApiValue(field('boolean', { is_required: 1 }), true)).toBe(true);
      expect(toApiValue(field('boolean'), 'yes')).toBe(true);
      expect(toApiValue(field('boolean'), 'no')).toBe(false);
      expect(toApiValue(field('boolean'), '')).toBeNull();
    });

    it('sends a date as the same string, never through a Date', () => {
      expect(toApiValue(field('date'), '2026-02-28')).toBe('2026-02-28');
      expect(toApiValue(field('date'), '')).toBeNull();
    });

    it('turns datetime-local into the back format', () => {
      expect(toApiValue(field('datetime'), '2026-03-15T08:30')).toBe('2026-03-15 08:30:00');
      expect(toApiValue(field('datetime'), '2026-03-15T08:30:45')).toBe('2026-03-15 08:30:45');
      expect(toApiValue(field('datetime'), '')).toBeNull();
    });

    it('sends a relation as its numeric id or null', () => {
      expect(toApiValue(field('relation'), 5)).toBe(5);
      expect(toApiValue(field('relation'), '5')).toBe(5);
      expect(toApiValue(field('relation'), null)).toBeNull();
    });
  });

  describe('toFormValue', () => {
    it('reads each type back into its control', () => {
      expect(toFormValue(field('text'), null)).toBe('');
      expect(toFormValue(field('text'), 'Maize')).toBe('Maize');
      expect(toFormValue(field('integer'), 0)).toBe('0');
      expect(toFormValue(field('decimal'), 12.5)).toBe('12.5');
      expect(toFormValue(field('date'), '2026-02-28')).toBe('2026-02-28');
      expect(toFormValue(field('relation'), 3)).toBe(3);
      expect(toFormValue(field('relation'), null)).toBeNull();
    });

    it('turns the back datetime into datetime-local, keeping seconds only when they matter', () => {
      expect(toFormValue(field('datetime'), '2026-03-15 08:30:00')).toBe('2026-03-15T08:30');
      expect(toFormValue(field('datetime'), '2026-03-15 08:30:45')).toBe('2026-03-15T08:30:45');
      expect(toFormValue(field('datetime'), null)).toBe('');
    });

    it('reads booleans as a switch when required and as yes / no / empty when optional', () => {
      expect(toFormValue(field('boolean', { is_required: 1 }), null)).toBe(false);
      expect(toFormValue(field('boolean', { is_required: 1 }), true)).toBe(true);
      expect(toFormValue(field('boolean'), true)).toBe('yes');
      expect(toFormValue(field('boolean'), false)).toBe('no');
      expect(toFormValue(field('boolean'), null)).toBe('');
    });

    it('round-trips a record through the form without changing it', () => {
      const fields = [field('text'), field('integer'), field('datetime'), field('boolean'), field('relation')];
      const record = { id: 1, text: 'a', integer: 0, datetime: '2026-03-15 08:30:00', boolean: false, relation: 2, is_active: true } as ListRecord;
      const values = initialValues(fields, record);
      expect(buildChangedBody(fields, values, { ...values })).toEqual({});
      expect(buildCreateBody(fields, values)).toEqual({ text: 'a', integer: 0, datetime: '2026-03-15 08:30:00', boolean: false, relation: 2 });
    });
  });

  describe('create and edit bodies', () => {
    const fields = [
      field('text', { code: 'name', is_required: 1 }),
      field('integer', { code: 'size' }),
      field('boolean', { code: 'staple' }),
      field('boolean', { code: 'flag', is_required: 1 }),
      field('relation', { code: 'crop' })
    ];

    it('leaves empty values out on create but keeps 0 and false', () => {
      const values = initialValues(fields);
      expect(buildCreateBody(fields, values)).toEqual({ flag: false });
      expect(buildCreateBody(fields, { ...values, name: 'Maize', size: '0', staple: 'no', crop: 4 })).toEqual({
        name: 'Maize',
        size: 0,
        staple: false,
        flag: false,
        crop: 4
      });
    });

    it('sends only the changed fields on edit, and null for a cleared one', () => {
      const initial = initialValues(fields, { id: 1, name: 'Maize', size: 5, staple: true, flag: true, crop: 2 } as ListRecord);
      expect(buildChangedBody(fields, initial, { ...initial })).toEqual({});
      expect(buildChangedBody(fields, initial, { ...initial, name: 'Rice', size: '', crop: null })).toEqual({ name: 'Rice', size: null, crop: null });
      expect(buildChangedBody(fields, initial, { ...initial, flag: false, staple: 'no' })).toEqual({ flag: false, staple: false });
    });
  });

  describe('helpers', () => {
    it('keeps the published fields in position order', () => {
      const list = [field('text', { id: 1, position: 2 }), field('date', { id: 2, position: 1 }), field('url', { id: 3, status: 'draft' })];
      expect(publishedFields(list).map(f => f.id)).toEqual([2, 1]);
    });

    it('labels a record by its first text property, else its id', () => {
      expect(recordLabel({ id: 3, name: 'Maize', other: 'x', is_active: true } as ListRecord)).toBe('Maize');
      expect(recordLabel({ id: 3, count: 4, is_active: true } as ListRecord)).toBe('#3');
      expect(recordLabel(null, 9)).toBe('#9');
      expect(recordLabel(undefined, null)).toBe('—');
    });

    it('reads is_active as boolean or 0/1', () => {
      expect(recordIsActive({ id: 1, is_active: true } as ListRecord)).toBe(true);
      expect(recordIsActive({ id: 1, is_active: 1 } as ListRecord)).toBe(true);
      expect(recordIsActive({ id: 1, is_active: false } as ListRecord)).toBe(false);
      expect(recordIsActive({ id: 1, is_active: 0 } as ListRecord)).toBe(false);
    });
  });
});
