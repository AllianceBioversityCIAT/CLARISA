import { CustomField } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { emptyFieldForm, fieldCreateBody, fieldFormError, fieldFormFrom, fieldPatchBody, groupListValues, isLocked, reorderPatches, suggestCode } from './setup-fields';

describe('setup rules', () => {
  const stored: CustomField = {
    id: 5,
    code: 'funding_source',
    label: 'Funding source',
    type: 'list',
    list_code: 'funders',
    required: false,
    is_public: true,
    sort: 1,
    is_active: true,
    help: null
  };

  it('locks code, type and list once the field exists, and the PATCH never carries them', () => {
    const form = fieldFormFrom(stored);
    expect(isLocked(form, 'code')).toBe(true);
    expect(isLocked(form, 'type')).toBe(true);
    expect(isLocked(emptyFieldForm(), 'code')).toBe(false);

    const edited = { ...form, code: 'hacked', type: 'text' as const, label: 'Funder', is_active: false };
    const patch = fieldPatchBody(edited, fieldFormFrom(stored));
    expect(patch).toEqual({ label: 'Funder', is_active: false });
    expect(Object.keys(patch)).not.toContain('code');
    expect(Object.keys(patch)).not.toContain('type');
  });

  it('checks a new field: code shape, uniqueness and list for list types', () => {
    const form = { ...emptyFieldForm(), label: 'Funding source', code: 'funding_source', type: 'list' as const };
    expect(fieldFormError(form, [stored])).toContain('already');
    expect(fieldFormError({ ...form, code: 'x_new' }, [stored])).toContain('controlled list');
    expect(fieldFormError({ ...form, code: 'x_new', list_code: 'funders' }, [stored])).toBeNull();
    expect(fieldFormError({ ...form, code: '9bad' }, [])).toContain('lower-case');
    expect(fieldCreateBody({ ...form, code: 'x_new', list_code: 'funders', type: 'text' })).not.toHaveProperty('list_code');
    expect(suggestCode('Date of review (ISO)')).toBe('date_of_review_iso');
  });

  it('groups list values in order and reorders with the minimum PATCHes', () => {
    const values = [
      { id: 1, list_code: 'b', value: 'x', label: 'X', sort: 0, is_active: true, shared: false },
      { id: 2, list_code: 'a', value: 'y', label: 'Y', sort: 1, is_active: false, shared: false },
      { id: 3, list_code: 'a', value: 'z', label: 'Z', sort: 0, is_active: true, shared: false }
    ];
    const groups = groupListValues(values);
    expect(groups.map(group => [group.code, group.values.map(v => v.id), group.active])).toEqual([
      ['a', [3, 2], 1],
      ['b', [1], 1]
    ]);
    expect(reorderPatches(groups[0].values, 1, -1)).toEqual([
      { id: 2, sort: 0 },
      { id: 3, sort: 1 }
    ]);
    expect(reorderPatches(groups[0].values, 0, -1)).toEqual([]);
  });
});
