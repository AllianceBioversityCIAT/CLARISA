import { AdminConceptDetail } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { emptyFilters, filterChips, matchesFilters, removeChip } from './concept-filters';

describe('concept filters', () => {
  const concept = (extra: Partial<AdminConceptDetail>): AdminConceptDetail =>
    ({
      term_id: 1,
      preferred_label: 'Outcome',
      definition: 'A change',
      status: 'approved',
      functions: ['monitoring'],
      phase_primary: 'design',
      phase_also: ['learning'],
      term_type: 'concept',
      alternative_labels: [],
      icons: [],
      ...extra
    }) as unknown as AdminConceptDetail;
  const lists = {
    functions: [{ value: 'monitoring', label: 'Monitoring' }],
    phase: [{ value: 'learning', label: 'Learning' }],
    term_type: [{ value: 'concept', label: 'Concept' }]
  };

  it('matches any of the values picked in a multi filter, and the secondary phases too', () => {
    expect(matchesFilters(concept({}), { ...emptyFilters(), functions: ['evaluation', 'monitoring'] })).toBe(true);
    expect(matchesFilters(concept({}), { ...emptyFilters(), functions: ['evaluation'] })).toBe(false);
    expect(matchesFilters(concept({}), { ...emptyFilters(), phases: ['learning'] })).toBe(true);
    expect(matchesFilters(concept({}), { ...emptyFilters(), statuses: ['draft', 'in_review'] })).toBe(false);
  });

  it('filters on icons and on a missing definition', () => {
    const withIcon = concept({ icons: [{ icon_code: 'x', status: 'final', format: null, alt_text: 'x', url: null }] });
    expect(matchesFilters(withIcon, { ...emptyFilters(), icon: 'with' })).toBe(true);
    expect(matchesFilters(withIcon, { ...emptyFilters(), icon: 'without' })).toBe(false);
    expect(matchesFilters(concept({ icons: undefined }), { ...emptyFilters(), icon: 'without' })).toBe(true);
    expect(matchesFilters(concept({ definition: '  ' }), { ...emptyFilters(), missingDefinition: true })).toBe(true);
    expect(matchesFilters(concept({}), { ...emptyFilters(), missingDefinition: true })).toBe(false);
  });

  it('draws one chip per active value with its label, and removing one leaves the rest', () => {
    const filters = { ...emptyFilters(), search: ' out ', functions: ['monitoring'], phases: ['learning'], icon: 'with' as const, missingDefinition: true };
    const chips = filterChips(filters, lists);
    expect(chips.map(chip => chip.label)).toEqual(['“out”', 'Function: Monitoring', 'Phase: Learning', 'Has an icon', 'Missing definition']);

    const next = removeChip(filters, chips[1]);
    expect(next.functions).toEqual([]);
    expect(next.phases).toEqual(['learning']);
    expect(filters.functions).toEqual(['monitoring']);
    expect(filterChips(emptyFilters(), lists)).toEqual([]);
  });
});
