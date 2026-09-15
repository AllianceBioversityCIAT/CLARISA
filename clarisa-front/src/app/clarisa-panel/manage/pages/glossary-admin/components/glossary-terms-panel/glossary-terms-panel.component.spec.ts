import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { GlossaryTermsPanelComponent } from './glossary-terms-panel.component';
import { GlossaryAdminTerm, ManageApiService } from '../../../../services/manage-api.service';

/**
 * A term written straight into `glossary` without its row in
 * `glossary_portfolios` is invisible under every portfolio filter of the public
 * page, and the panel used to render it as an empty cell. These tests fix the
 * two things that make it findable: the count and the filter.
 */
describe('GlossaryTermsPanelComponent — terms with no portfolio', () => {
  let component: GlossaryTermsPanelComponent;

  const term = (id: number, name: string, portfolioIds: number[], isActive = true, groupId?: number): GlossaryAdminTerm =>
    ({
      id,
      group_id: groupId ?? id,
      term: name,
      definition: `Definition of ${name}`,
      source: null,
      source_url: null,
      reference_date: null,
      is_active: isActive,
      show_in_dashboard: false,
      application_name: null,
      portfolios: portfolioIds.map(portfolioId => ({ id: portfolioId, name: `Portfolio ${portfolioId}`, acronym: `P${portfolioId}` }))
    }) as unknown as GlossaryAdminTerm;

  const terms = [
    term(1, 'Impact', [2, 3]),
    term(2, 'Outcome', [3]),
    term(3, 'Santiago', []),
    term(4, 'Examplee', [], false),
    // The pair that exists in production: same concept, titles that differ by a
    // non-breaking space, related through the group and not through the text.
    term(5, 'Non-IPSR pathway', [2]),
    term(6, 'Non-IPSR pathway\u00a0', [3], true, 5)
  ];

  const portfolios = [
    { code: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22', is_active: 1, start_date: 2022 },
    { code: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25', is_active: 1, start_date: 2025 }
  ];

  beforeEach(() => {
    const apiService = {
      getGlossaryTerms: () => of(terms),
      getAllPortfolios: () => of(portfolios)
    } as unknown as ManageApiService;

    component = new GlossaryTermsPanelComponent(
      apiService,
      new FormBuilder(),
      { add: jest.fn() } as unknown as MessageService,
      { confirm: jest.fn() } as unknown as ConfirmationService
    );
    component.ngOnInit();
  });

  it('counts the terms with no portfolio, and how many of those are published', () => {
    expect(component.unassignedCount).toBe(2);
    expect(component.unassignedActiveCount).toBe(1);
  });

  it('offers the "no portfolio" entry only to the filter, never to the edit dialog', () => {
    expect(component.portfolioFilterOptions[0]).toEqual({ label: 'No portfolio linked', value: component.NO_PORTFOLIO });
    expect(component.portfolioOptions.some(option => option.value === component.NO_PORTFOLIO)).toBe(false);
    expect(component.NO_PORTFOLIO).toBeLessThan(0);
  });

  it('lists the unlinked terms, active and inactive alike, so they can be fixed or deactivated', () => {
    component.showUnassigned();

    expect(component.filteredTerms.map(concept => concept.current.term)).toEqual(['Examplee', 'Santiago']);
    expect(component.statusFilter).toBe('all');
  });

  it('keeps filtering by a real portfolio', () => {
    component.portfolioFilter = 2;
    component.applyFilters();

    expect(component.filteredTerms.map(concept => concept.current.term)).toEqual(['Impact', 'Non-IPSR pathway\u00a0']);
  });

  it('shows every concept again once the filters are cleared', () => {
    component.showUnassigned();
    component.clearFilters();

    // Six records, five concepts: the Non-IPSR pair is one term with two
    // definitions, so the table shows it on a single line.
    expect(component.filteredTerms).toHaveLength(5);
    expect(component.terms).toHaveLength(6);
  });

  it('shows the definition of the most recent portfolio on the line, and keeps the rest inside', () => {
    const concept = component.filteredTerms.find(c => c.versions.length > 1);

    // #6 carries 2025-2030 and #5 carries 2022-2024, so the line is #6.
    expect(concept.current.id).toBe(6);
    expect(concept.versions.map(v => v.id)).toEqual([6, 5]);
    // And the line carries the chips of both portfolios, newest first.
    expect(concept.portfolios.map(p => p.id)).toEqual([3, 2]);
  });

  it('counts the versions of a concept through the group, not the term', () => {
    const versioned = component.terms.find(t => t.id === 5);
    const twin = component.terms.find(t => t.id === 6);

    expect(component.versionCount(versioned)).toBe(2);
    // The two titles are not equal — only the group ties them together.
    expect(versioned.term).not.toBe(twin.term);
    expect(component.versionsOf(versioned).map(t => t.id)).toEqual([5, 6]);
  });

  it('leaves a term that stands alone as its own single version', () => {
    expect(component.versionCount(component.terms[0])).toBe(1);
  });

  it('offers to relate every term outside the concept, and never one of its own versions', () => {
    component.openVersions(component.terms.find(t => t.id === 5));
    component.openRelate();

    const offered = component.relateOptions.map(option => option.value);
    expect(offered).not.toContain(5);
    expect(offered).not.toContain(6);
    expect(offered).toContain(1);
  });

  // The dialog froze on a workspace with ~300 terms: every one of these lists
  // was a getter returning a new array, so Angular rebuilt and re-sorted them
  // on every change detection pass — including each keystroke of the
  // dropdown's own filter. They are computed on the opening event instead.
  it('builds the relate list only when the picker is opened', () => {
    component.openVersions(component.terms.find(t => t.id === 5));
    expect(component.relateOptions).toEqual([]);

    component.openRelate();
    expect(component.relateOptions.length).toBeGreaterThan(0);

    component.closeVersions();
    expect(component.relateOptions).toEqual([]);
  });

  it('counts versions from an index instead of scanning the terms per row', () => {
    const scan = jest.spyOn(component, 'versionsOf');

    component.terms.forEach(term => component.versionCount(term));

    expect(scan).not.toHaveBeenCalled();
  });

  it('only offers to split the portfolios the record actually holds', () => {
    component.openSplit(component.terms[0]);

    expect(component.splitPortfolioOptions.map(option => option.value)).toEqual([2, 3]);
  });
});
