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

  const term = (id: number, name: string, portfolioIds: number[], isActive = true): GlossaryAdminTerm =>
    ({
      id,
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

  const terms = [term(1, 'Impact', [2, 3]), term(2, 'Outcome', [3]), term(3, 'Santiago', []), term(4, 'Examplee', [], false)];

  const portfolios = [
    { code: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22', is_active: 1 },
    { code: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25', is_active: 1 }
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

    expect(component.filteredTerms.map(t => t.term)).toEqual(['Santiago', 'Examplee']);
    expect(component.statusFilter).toBe('all');
  });

  it('keeps filtering by a real portfolio', () => {
    component.portfolioFilter = 2;
    component.applyFilters();

    expect(component.filteredTerms.map(t => t.term)).toEqual(['Impact']);
  });

  it('shows every term again once the filters are cleared', () => {
    component.showUnassigned();
    component.clearFilters();

    expect(component.filteredTerms).toHaveLength(terms.length);
  });
});
