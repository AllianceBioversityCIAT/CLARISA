import { CustomField } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { activeFields, buildExtra, controlFor, customCellText, customFieldsError, valuesFromExtra } from './custom-fields';

describe('custom fields', () => {
  const field = (code: string, type: CustomField['type'], extra: Partial<CustomField> = {}): CustomField => ({
    id: 1,
    code,
    label: code,
    type,
    list_code: null,
    required: false,
    is_public: true,
    sort: 0,
    is_active: true,
    help: null,
    ...extra
  });
  const fields = [field('note', 'text'), field('tags', 'multi_text'), field('links', 'term_link'), field('size', 'number'), field('site', 'url')];

  it('draws the control that belongs to each type', () => {
    expect(
      ['text', 'long_text', 'multi_text', 'list', 'multi_list', 'term_link', 'url', 'date', 'number'].map(type =>
        controlFor(type as CustomField['type'])
      )
    ).toEqual(['text', 'textarea', 'chips', 'dropdown', 'multiselect', 'concepts', 'url', 'date', 'number']);
  });

  it('keeps only active fields, in their order', () => {
    const list = activeFields([field('b', 'text', { sort: 2 }), field('a', 'text', { sort: 1 }), field('off', 'text', { is_active: false })]);
    expect(list.map(item => item.code)).toEqual(['a', 'b']);
  });

  it('reads extra into control values, term links as ids', () => {
    const values = valuesFromExtra(fields, { note: 'x', tags: 'one', links: [{ term_id: 7 }, 9], size: '3' });
    expect(values).toEqual({ note: 'x', tags: ['one'], links: [7, 9], size: 3, site: '' });
  });

  it('sends only the changed keys on update, and a cleared one as ""', () => {
    const original = valuesFromExtra(fields, { note: 'x', tags: ['a'], links: [7], size: 3 });
    const edited = { ...original, note: 'x', tags: [], links: [7, 8], size: null };

    expect(buildExtra(fields, edited, original)).toEqual({ tags: '', links: [7, 8], size: '' });
    expect(buildExtra(fields, original, original)).toBeNull();
  });

  it('sends only the filled keys on create', () => {
    const values = { ...valuesFromExtra(fields, {}), note: ' hello ', size: 0 };
    expect(buildExtra(fields, values, null)).toEqual({ note: 'hello', size: 0 });
  });

  it('enforces required on create and when a required key is emptied, and checks urls', () => {
    const required = [field('owner', 'text', { required: true }), field('site', 'url')];
    expect(customFieldsError(required, { owner: '', site: '' }, true, null)).toBe('owner is required.');
    // Untouched on update: the back does not enforce it either.
    expect(customFieldsError(required, { owner: '', site: '' }, false, { owner: '', site: '' })).toBeNull();
    expect(customFieldsError(required, { owner: '', site: '' }, false, { owner: 'Ana', site: '' })).toBe('owner is required.');
    expect(customFieldsError(required, { owner: 'Ana', site: 'ftp://x' }, true, null)).toContain('http');
  });
});

describe('customCellText', () => {
  const field = (type: CustomField['type'], list_code: string | null = null): CustomField => ({
    id: 1,
    code: 'x',
    label: 'X',
    type,
    list_code,
    required: false,
    is_public: true,
    sort: 0,
    is_active: true,
    help: null
  });
  const lists = { funding: [{ value: 'w1', label: 'Window 1' }] };
  const labelOf = (id: number) => (id === 2375 ? 'Achievements' : undefined);

  it('is empty when the concept has no value', () => {
    expect(customCellText(field('text'), {}, lists, labelOf)).toBe('');
    expect(customCellText(field('term_link'), { x: [] }, lists, labelOf)).toBe('');
    expect(customCellText(field('text'), null, lists, labelOf)).toBe('');
  });

  it('shows linked concepts by label, and the TERM ID when the concept is unknown', () => {
    expect(customCellText(field('term_link'), { x: [2375, 9999] }, lists, labelOf)).toBe('Achievements, TERM 9999');
  });

  it('shows list values by their label and keeps an unknown value as is', () => {
    expect(customCellText(field('multi_list', 'funding'), { x: ['w1', 'w9'] }, lists, labelOf)).toBe('Window 1, w9');
  });

  it('shows plain values unchanged', () => {
    expect(customCellText(field('number'), { x: 7 }, lists, labelOf)).toBe('7');
    expect(customCellText(field('multi_text'), { x: ['a', 'b'] }, lists, labelOf)).toBe('a, b');
  });
});
