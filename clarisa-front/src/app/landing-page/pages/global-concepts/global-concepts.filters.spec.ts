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
  urlQuery,
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
    functions: [],
    phase_primary: null,
    phase_also: [],
    term_type: null,
    status: 'approved',
    date_modified: null,
    ...extra
  }) as FilterableConcept;

const data: FilterableConcept[] = [
  c(1, 'Outcome', { functions: ['mel', 'learning'], phase_primary: 'design', term_type: 'core', date_modified: '2026-09-01' }),
  c(2, 'Output', { functions: ['mel'], phase_primary: 'implementation', term_type: 'core', date_modified: '2026-09-20' }),
  c(3, 'Évaluation', {
    functions: ['evaluation'],
    phase_primary: 'design',
    phase_also: ['implementation'],
    term_type: 'process'
  }),
  c(4, 'Old outcome', { functions: ['mel'], status: 'deprecated', term_type: 'core', date_modified: '2026-09-25' }),
  c(5, 'Learning agenda', {
    functions: ['learning'],
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
      expect(ids(applyFilters(data, state({ facets: { functions: ['evaluation', 'learning'] } })))).toEqual([1, 3, 5]);
    });

    it('is AND across facets', () => {
      const s = state({ facets: { functions: ['mel', 'learning'], term_type: ['core'] } });
      expect(ids(applyFilters(data, s))).toEqual([1, 2]);
    });

    it('reads the phase from primary and "also", like the back', () => {
      expect(ids(applyFilters(data, state({ facets: { phase: ['implementation'] } })))).toEqual([2, 3]);
    });

    it('hides deprecated concepts unless they are included', () => {
      expect(ids(applyFilters(data, state({ facets: { functions: ['mel'] } })))).toEqual([1, 2]);
      expect(ids(applyFilters(data, state({ deprecated: true, facets: { functions: ['mel'] } })))).toEqual([1, 2, 4]);
    });

    it('filters by collection when the concepts carry it', () => {
      expect(ids(applyFilters(data, state({ facets: { collection: ['starter'] } })))).toEqual([5]);
    });
  });

  describe('facet counts', () => {
    it('counts each value over the current result', () => {
      const counts = facetCounts(data, state(), 'functions');
      expect(Object.fromEntries(counts)).toEqual({ mel: 2, learning: 2, evaluation: 1 });
    });

    it('leaves the facet own selection out of its counts, and applies the others', () => {
      const s = state({ facets: { functions: ['mel'], term_type: ['core'] } });
      // Function counts see term_type=core only: Outcome and Output.
      expect(Object.fromEntries(facetCounts(data, s, 'functions'))).toEqual({ mel: 2, learning: 1 });
      // Term type counts see function=mel only.
      expect(Object.fromEntries(facetCounts(data, s, 'term_type'))).toEqual({ core: 2 });
    });

    it('follows the search text and the deprecated toggle', () => {
      expect(Object.fromEntries(facetCounts(data, state({ q: 'outcome' }), 'term_type'))).toEqual({ core: 1 });
      expect(Object.fromEntries(facetCounts(data, state({ q: 'outcome', deprecated: true }), 'term_type'))).toEqual({ core: 2 });
    });

    it('draws options in list order with labels, and hides a facet nobody uses', () => {
      const lists = {
        term_type: [
          { value: 'process', label: 'Process step' },
          { value: 'core', label: 'Core term' }
        ]
      };
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
      const s = state({
        q: 'learning',
        sort: 'updated',
        deprecated: true,
        facets: { functions: ['mel', 'learning'], collection: ['starter'] }
      });
      const params = filterParams(s);
      expect(params).toEqual({
        q: 'learning',
        sort: 'updated',
        deprecated: '1',
        functions: 'mel,learning',
        phase: null,
        term_type: null,
        collection: 'starter'
      });
      const back = parseFilterParams(new URLSearchParams(Object.entries(params).filter(([, v]) => v !== null) as [string, string][]));
      expect(sameState(back, s)).toBe(true);
      expect(back.facets.functions).toEqual(['mel', 'learning']);
    });

    it('drops defaults and ignores an unknown sort', () => {
      expect(filterParams(emptyState())).toEqual({
        q: null,
        sort: null,
        deprecated: null,
        functions: null,
        phase: null,
        term_type: null,
        collection: null
      });
      expect(parseFilterParams(new URLSearchParams('sort=random&phase=,a,,a')).sort).toBe('best');
      expect(parseFilterParams(new URLSearchParams('phase=,a,,a')).facets.phase).toEqual(['a']);
    });
  });

  it('builds the chips and the selected count', () => {
    const s = state({ q: 'out', deprecated: true, facets: { term_type: ['core'] } });
    const chips = activeChips(s, facetViews(data, s, { term_type: [{ value: 'core', label: 'Core term' }] }));
    expect(chips.map(ch => ch.label)).toEqual(['"out"', 'Term type: Core term', 'Including deprecated']);
    expect(selectedCount(s)).toBe(1);
  });

  describe('urlQuery (the search as the URL carries it)', () => {
    it('trims and caps, so the page can recognise the echo of its own write', () => {
      expect(urlQuery('soil ')).toBe('soil');
      expect(urlQuery(' a'.repeat(150))).toHaveLength(200 - 1);
      expect(urlQuery('x'.repeat(250))).toHaveLength(200);
      expect(urlQuery(null)).toBe('');
    });

    it('writes and reads back the same form', () => {
      const q = 'y'.repeat(230) + ' ';
      const written = filterParams({ ...emptyState(), q })['q'] as string;
      expect(parseFilterParams({ get: (name: string) => (name === 'q' ? written : null) }).q).toBe(urlQuery(q));
    });
  });
});
