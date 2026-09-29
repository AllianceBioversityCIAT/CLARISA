import { groupLists, listLabel } from './list-values';

describe('Global Concepts — controlled lists', () => {
  it('groups the typed array shape by list code, in sort order', () => {
    const lists = groupLists([
      { list_code: 'term_type', value: 'method', label: 'Method', sort: 2 },
      { list_code: 'term_type', value: 'concept', label: 'Concept', sort: 1 },
      { list_code: 'meliaf_function', value: 'monitoring', label: 'Monitoring', sort: 1 }
    ]);

    expect(lists['term_type']).toEqual([
      { value: 'concept', label: 'Concept' },
      { value: 'method', label: 'Method' }
    ]);
    expect(lists['meliaf_function']).toEqual([{ value: 'monitoring', label: 'Monitoring' }]);
  });

  it('also reads the object keyed by list code that the back answers', () => {
    const lists = groupLists({ derivation: [{ value: 'adopted', label: 'Adopted' }], broken: 'x' });

    expect(lists).toEqual({ derivation: [{ value: 'adopted', label: 'Adopted' }] });
  });

  it('survives an empty or odd answer', () => {
    expect(groupLists(null)).toEqual({});
    expect(groupLists('nope')).toEqual({});
  });

  it('shows the label of a stored value, or the raw value when unknown', () => {
    const lists = groupLists({ meliaf_function: [{ value: 'ia', label: 'Impact assessment' }] });

    expect(listLabel(lists, 'meliaf_function', 'ia')).toBe('Impact assessment');
    expect(listLabel(lists, 'meliaf_function', 'other')).toBe('other');
    expect(listLabel(lists, 'meliaf_function', null)).toBe('');
  });
});
