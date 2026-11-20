import { FieldRow, ListRecord } from '../models/control-lists.models';
import {
  ambiguousNumber,
  buildChangedBody,
  buildCreateBody,
  initialValues,
  isMissing,
  publishedFields,
  recordIsActive,
  recordLabel,
  toApiValue,
  toFormValue,
  utf8Bytes,
  valueProblem
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
      // A comma between digits is a decimal separator; anything else (thousands, two commas) goes as typed.
      expect(toApiValue(field('decimal'), '1,000.5')).toBe('1,000.5');
      expect(toApiValue(field('decimal'), '1,2,3')).toBe('1,2,3');
      expect(toApiValue(field('integer'), '12,5')).toBe('12,5');
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

  describe('decimal typed with a comma', () => {
    it('is sent with a dot', () => {
      expect(toApiValue(field('decimal'), '3,5')).toBe(3.5);
      expect(toApiValue(field('decimal'), ' -0,25 ')).toBe(-0.25);
      expect(toApiValue(field('decimal'), '3.5')).toBe(3.5);
    });

    it('reaches the create and edit bodies as a number', () => {
      const fields = [field('decimal', { code: 'share' })];
      expect(buildCreateBody(fields, { share: '3,5' })).toEqual({ share: 3.5 });
      expect(buildChangedBody(fields, { share: '1' }, { share: '3,5' })).toEqual({ share: 3.5 });
    });
  });

  describe('isMissing', () => {
    it('is true for a required field with nothing in it, and for blank text', () => {
      expect(isMissing(field('text', { is_required: 1 }), '')).toBe(true);
      expect(isMissing(field('text', { is_required: 1 }), '   ')).toBe(true);
      expect(isMissing(field('relation', { is_required: 1 }), null)).toBe(true);
      expect(isMissing(field('integer', { is_required: 1 }), undefined)).toBe(true);
    });

    it('is false for a value, for 0, for a switch, and for an optional field', () => {
      expect(isMissing(field('text', { is_required: 1 }), 'Maize')).toBe(false);
      expect(isMissing(field('integer', { is_required: 1 }), '0')).toBe(false);
      expect(isMissing(field('boolean', { is_required: 1 }), false)).toBe(false);
      expect(isMissing(field('text'), '')).toBe(false);
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

describe('numbers that cannot be read safely, and long texts over their bytes', () => {
  const decimal = field('decimal');
  const notes = field('long_text');

  it.each([
    ['12,000', '12000', '12.0'],
    ['1,234', '1234', '1.234'],
    ['1,234,567', '1234567', '1.234567'],
    ['-1,000', '-1000', '-1.0']
  ])('refuses %s: thousands or a decimal comma, with both readings built from its digits', (typed, whole, dec) => {
    expect(ambiguousNumber(typed)).toBe(`Ambiguous number: write ${whole} if the comma separates thousands, or ${dec} if it is the decimal point.`);
    expect(valueProblem(decimal, typed)).toBe(ambiguousNumber(typed));
    // Never converted: it goes as typed if anything ever sends it.
    expect(toApiValue(decimal, typed)).toBe(typed);
  });

  it.each([
    ['2,9', 2.9],
    ['12,50', 12.5]
  ])('keeps %s as a decimal comma', (typed, value) => {
    expect(ambiguousNumber(typed)).toBeNull();
    expect(valueProblem(decimal, typed)).toBeNull();
    expect(toApiValue(decimal, typed)).toBe(value);
  });

  it('only decimals are checked for the comma', () => {
    expect(valueProblem(field('text'), '12,000')).toBeNull();
  });

  it('counts UTF-8 bytes, and a long text over 65,535 of them is refused', () => {
    expect(utf8Bytes('aé€😀')).toBe(1 + 2 + 3 + 4);
    expect(valueProblem(notes, 'é'.repeat(32_768))).toBe('Too long: this text needs 65,536 bytes of the 65,535 a long text holds.');
    expect(valueProblem(notes, 'é'.repeat(32_767))).toBeNull();
  });
});
