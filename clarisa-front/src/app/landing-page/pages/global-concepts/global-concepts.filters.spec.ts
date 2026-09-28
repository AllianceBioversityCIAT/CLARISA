import {
  FilterState,
  FilterableConcept,
  activeChips,
  applyFilters,
  emptyState,
  facetCounts,
  facetViews,
  filterParams,
  matchesText,
  parseFilterParams,
  sameState,
  selectedCount,
  sortConcepts
} from './global-concepts.filters';

const c = (term_id: number, label: string, extra: Partial<FilterableConcept> = {}): FilterableConcept =>
  ({
    term_id,
    preferred_label: label,
    preferred_labels: [],
    alternative_labels: [],
    definition: null,
    short_definition: null,
    meliaf_function: [],
    meliaf_phase_primary: null,
    meliaf_phase_also: [],
    term_type: null,
    status: 'approved',
    date_modified: null,
    ...extra
  }) as FilterableConcept;

const data: FilterableConcept[] = [
  c(1, 'Outcome', { meliaf_function: ['mel', 'learning'], meliaf_phase_primary: 'design', term_type: 'core', date_modified: '2026-09-01' }),
  c(2, 'Output', { meliaf_function: ['mel'], meliaf_phase_primary: 'implementation', term_type: 'core', date_modified: '2026-09-20' }),
  c(3, 'Évaluation', { meliaf_function: ['evaluation'], meliaf_phase_primary: 'design', meliaf_phase_also: ['implementation'], term_type: 'process' }),
  c(4, 'Old outcome', { meliaf_function: ['mel'], status: 'deprecated', term_type: 'core', date_modified: '2026-09-25' }),
  c(5, 'Learning agenda', {
    meliaf_function: ['learning'],
    alternative_labels: [{ label: 'LA', language: 'en', kind: 'acronym', discouraged: false }],
    collections: [{ code: 'starter', label: 'Starter set' }]
  })
];

const state = (patch: Partial<Omit<FilterState, 'facets'>> & { facets?: Partial<FilterState['facets']> } = {}): FilterState => {
  const base = emptyState();
  return { ...base, ...patch, facets: { ...base.facets, ...(patch.facets ?? {}) } };
};

const ids = (rows: FilterableConcept[]) => rows.map(r => r.term_id);

describe('global-concepts.filters', () => {
  describe('text match', () => {
    it('matches labels, acronyms and definitions ignoring case and accents, every word', () => {
      expect(matchesText(data[2], 'evaluation')).toBe(true);
      expect(matchesText(data[4], 'la')).toBe(true);
      expect(matchesText(data[0], 'outcome zzz')).toBe(false);
      expect(matchesText(data[0], 'come out')).toBe(true);
      expect(matchesText(data[0], 'OUTCOME')).toBe(true);
    });

    it('adds the hits the back found for the same query', () => {
      const hits = new Set([2]);
      expect(ids(applyFilters(data, state({ q: 'hidden-synonym' }), hits))).toEqual([2]);
    });
  });

  describe('multi-select logic', () => {
    it('is OR inside one facet', () => {
      expect(ids(applyFilters(data, state({ facets: { meliaf_function: ['evaluation', 'learning'] } })))).toEqual([1, 3, 5]);
    });

    it('is AND across facets', () => {
      const s = state({ facets: { meliaf_function: ['mel', 'learning'], term_type: ['core'] } });
      expect(ids(applyFilters(data, s))).toEqual([1, 2]);
    });

    it('reads the phase from primary and "also", like the back', () => {
      expect(ids(applyFilters(data, state({ facets: { meliaf_phase: ['implementation'] } })))).toEqual([2, 3]);
    });

    it('hides deprecated concepts unless they are included', () => {
      expect(ids(applyFilters(data, state({ facets: { meliaf_function: ['mel'] } })))).toEqual([1, 2]);
      expect(ids(applyFilters(data, state({ deprecated: true, facets: { meliaf_function: ['mel'] } })))).toEqual([1, 2, 4]);
    });

    it('filters by collection when the concepts carry it', () => {
      expect(ids(applyFilters(data, state({ facets: { collection: ['starter'] } })))).toEqual([5]);
    });
  });

  describe('facet counts', () => {
    it('counts each value over the current result', () => {
      const counts = facetCounts(data, state(), 'meliaf_function');
      expect(Object.fromEntries(counts)).toEqual({ mel: 2, learning: 2, evaluation: 1 });
    });

    it('leaves the facet own selection out of its counts, and applies the others', () => {
      const s = state({ facets: { meliaf_function: ['mel'], term_type: ['core'] } });
      // Function counts see term_type=core only: Outcome and Output.
      expect(Object.fromEntries(facetCounts(data, s, 'meliaf_function'))).toEqual({ mel: 2, learning: 1 });
      // Term type counts see function=mel only.
      expect(Object.fromEntries(facetCounts(data, s, 'term_type'))).toEqual({ core: 2 });
    });

    it('follows the search text and the deprecated toggle', () => {
      expect(Object.fromEntries(facetCounts(data, state({ q: 'outcome' }), 'term_type'))).toEqual({ core: 1 });
      expect(Object.fromEntries(facetCounts(data, state({ q: 'outcome', deprecated: true }), 'term_type'))).toEqual({ core: 2 });
    });

    it('draws options in list order with labels, and hides a facet nobody uses', () => {
      const lists = { term_type: [{ value: 'process', label: 'Process step' }, { value: 'core', label: 'Core term' }] };
      const views = facetViews(data, state(), lists);
      const type = views.find(v => v.code === 'term_type');
      expect(type?.options.map(o => [o.value, o.label, o.count])).toEqual([
        ['process', 'Process step', 1],
        ['core', 'Core term', 2]
      ]);
      expect(views.find(v => v.code === 'collection')?.options[0]).toEqual({ value: 'starter', label: 'Starter set', count: 1, checked: false });
      expect(facetViews([data[1]], state(), {}).find(v => v.code === 'collection')).toBeUndefined();
    });
  });

  describe('sort', () => {
    it('sorts A to Z, Z to A and by last update', () => {
      const approved = data.slice(0, 3);
      expect(sortConcepts(approved, 'az').map(r => r.preferred_label)).toEqual(['Évaluation', 'Outcome', 'Output']);
      expect(sortConcepts(approved, 'za').map(r => r.preferred_label)).toEqual(['Output', 'Outcome', 'Évaluation']);
      // Newest first; no date goes last.
      expect(ids(sortConcepts(approved, 'updated'))).toEqual([2, 1, 3]);
    });
  });

  describe('URL', () => {
    it('round-trips every part of the state', () => {
      const s = state({ q: 'learning', sort: 'updated', deprecated: true, facets: { meliaf_function: ['mel', 'learning'], collection: ['starter'] } });
      const params = filterParams(s);
      expect(params).toEqual({
        q: 'learning',
        sort: 'updated',
        deprecated: '1',
        meliaf_function: 'mel,learning',
        meliaf_phase: null,
        term_type: null,
        collection: 'starter'
      });
      const back = parseFilterParams(new URLSearchParams(Object.entries(params).filter(([, v]) => v !== null) as [string, string][]));
      expect(sameState(back, s)).toBe(true);
      expect(back.facets.meliaf_function).toEqual(['mel', 'learning']);
    });

    it('drops defaults and ignores an unknown sort', () => {
      expect(filterParams(emptyState())).toEqual({ q: null, sort: null, deprecated: null, meliaf_function: null, meliaf_phase: null, term_type: null, collection: null });
      expect(parseFilterParams(new URLSearchParams('sort=random&meliaf_phase=,a,,a')).sort).toBe('az');
      expect(parseFilterParams(new URLSearchParams('meliaf_phase=,a,,a')).facets.meliaf_phase).toEqual(['a']);
    });
  });

  it('builds the chips and the selected count', () => {
    const s = state({ q: 'out', deprecated: true, facets: { term_type: ['core'] } });
    const chips = activeChips(s, facetViews(data, s, { term_type: [{ value: 'core', label: 'Core term' }] }));
    expect(chips.map(ch => ch.label)).toEqual(['"out"', 'Term type: Core term', 'Including deprecated']);
    expect(selectedCount(s)).toBe(1);
  });
});
