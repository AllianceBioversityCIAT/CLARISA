import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

import { GlossaryComponent } from './glossary.component';
import { GlossaryPageService } from './services/glossary-page.service';

describe('GlossaryComponent', () => {
  let component: GlossaryComponent;
  let fixture: ComponentFixture<GlossaryComponent>;
  let mockService: any;

  const terms = [
    { term: 'Action Area', definition: 'Areas of work', portfolios: [{ id: 2, name: 'CGIAR portfolio 2022-2024' }] },
    { term: 'Innovation', definition: 'Something new', portfolios: [{ id: 3, name: 'CGIAR portfolio 2025-2030' }] },
    {
      term: 'Shared term',
      definition: 'Belongs to both',
      portfolios: [
        { id: 2, name: 'CGIAR portfolio 2022-2024' },
        { id: 3, name: 'CGIAR portfolio 2025-2030' }
      ]
    },
    { term: 'Orphan', definition: 'No portfolios yet', portfolios: [] }
  ];

  beforeEach(async () => {
    mockService = {
      getGlossary: jest.fn().mockReturnValue(of(terms)),
      // Shaped like `GET api/portfolios?show=all` really answers: the default
      // portfolio is picked from `start_date`, so a mock without it would hide
      // that behaviour from every test below.
      getPortfolios: jest.fn().mockReturnValue(
        of([
          { code: 1, name: 'CGIAR portfolio 2016-2021', start_date: 2016, end_date: 2021, acronym: null, is_active: 0 },
          { code: 2, name: 'CGIAR portfolio 2022-2024', start_date: 2022, end_date: 2024, acronym: 'P22', is_active: 1 },
          { code: 3, name: 'CGIAR portfolio 2025-2030', start_date: 2025, end_date: 2030, acronym: 'P25', is_active: 1 },
          { code: 4, name: 'CGIAR general', acronym: null, is_active: 1 }
        ])
      )
    };

    await TestBed.configureTestingModule({
      declarations: [GlossaryComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: GlossaryPageService, useValue: mockService }]
    }).compileComponents();

    fixture = TestBed.createComponent(GlossaryComponent);
    component = fixture.componentInstance;
  });

  /** What a reader does when they want the whole glossary back. */
  const showAllPortfolios = () => component.selectPortfolio(null);

  it('should create and load terms and portfolios', () => {
    fixture.detectChanges();
    expect(component.terms.length).toBe(4);
    expect(component.portfolios.length).toBe(4);
    expect(component.loading).toBe(false);
  });

  it('should open on the newest active portfolio instead of on every term', () => {
    fixture.detectChanges();
    expect(component.selectedPortfolioCode).toBe(3);
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Innovation', 'Shared term']);
  });

  it('should show every term once the reader asks for all portfolios', () => {
    fixture.detectChanges();
    showAllPortfolios();
    expect(component.selectedPortfolioCode).toBeNull();
    expect(component.filteredTerms.length).toBe(4);
  });

  it('should pick the newest ACTIVE portfolio, not the newest one', () => {
    mockService.getPortfolios.mockReturnValue(
      of([
        { code: 2, name: 'CGIAR portfolio 2022-2024', start_date: 2022, is_active: 1 },
        { code: 3, name: 'CGIAR portfolio 2025-2030', start_date: 2025, is_active: 0 }
      ])
    );
    fixture.detectChanges();
    expect(component.selectedPortfolioCode).toBe(2);
  });

  it('should fall back to every term when no portfolio carries a start year', () => {
    mockService.getPortfolios.mockReturnValue(of([{ code: 4, name: 'CGIAR general', is_active: 1 }]));
    fixture.detectChanges();
    expect(component.selectedPortfolioCode).toBeNull();
    expect(component.filteredTerms.length).toBe(4);
  });

  it('should filter by search text over term and definition (case-insensitive)', () => {
    fixture.detectChanges();
    showAllPortfolios();
    component.searchText = 'ACTION';
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Action Area']);

    component.searchText = 'belongs';
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Shared term']);
  });

  it('should filter by portfolio id', () => {
    fixture.detectChanges();
    showAllPortfolios();
    component.selectPortfolio(3);
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Innovation', 'Shared term']);
  });

  it('should combine search and portfolio filter', () => {
    fixture.detectChanges();
    showAllPortfolios();
    component.selectPortfolio(3);
    component.searchText = 'shared';
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Shared term']);
  });

  it('should toggle the portfolio selection off when clicked twice', () => {
    fixture.detectChanges();
    showAllPortfolios();
    component.selectPortfolio(2);
    component.selectPortfolio(2);
    expect(component.selectedPortfolioCode).toBeNull();
    expect(component.filteredTerms.length).toBe(4);
  });

  it('should end loading and keep an empty list when the API fails', () => {
    mockService.getGlossary.mockReturnValue(throwError(() => new Error('down')));
    fixture.detectChanges();
    expect(component.loading).toBe(false);
    expect(component.terms).toEqual([]);
    expect(component.filteredTerms).toEqual([]);
  });

  it('should return terms sorted alphabetically', () => {
    fixture.detectChanges();
    showAllPortfolios();
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Action Area', 'Innovation', 'Orphan', 'Shared term']);
  });

  describe('letter filter', () => {
    beforeEach(() => {
      fixture.detectChanges();
      showAllPortfolios();
    });

    it('should expose only the initials that exist', () => {
      expect(component.availableLetters).toEqual(['A', 'I', 'O', 'S']);
    });

    it('should filter terms by the selected initial and toggle off', () => {
      component.selectLetter('S');
      expect(component.filteredTerms.map(t => t.term)).toEqual(['Shared term']);
      component.selectLetter('S');
      expect(component.filteredTerms.length).toBe(4);
    });

    it('should recompute letters when a portfolio is selected and drop an orphan selection', () => {
      component.selectLetter('A');
      component.selectPortfolio(3);
      expect(component.availableLetters).toEqual(['I', 'S']);
      expect(component.selectedLetter).toBeNull();
    });
  });

  describe('portfolio filter pills', () => {
    it('should offer every active portfolio (even without terms) and hide inactive ones', () => {
      mockService.getPortfolios.mockReturnValue(
        of([
          { code: 1, name: 'CGIAR portfolio 2016-2021', is_active: 0 },
          { code: 2, name: 'CGIAR portfolio 2022-2024', is_active: 1 },
          { code: 3, name: 'CGIAR portfolio 2025-2030', is_active: 1 },
          { code: 4, name: 'CGIAR general', is_active: 1 }
        ])
      );
      fixture.detectChanges();
      expect(component.filterPortfolios.map((p: any) => p.code)).toEqual([2, 3, 4]);
    });
  });

  describe('portfolioLabel', () => {
    it('should strip the CGIAR prefix and keep a capital first letter', () => {
      fixture.detectChanges();
      expect(component.portfolioLabel('CGIAR portfolio 2022-2024')).toBe('Portfolio 2022-2024');
      expect(component.portfolioLabel('CGIAR general')).toBe('General');
      expect(component.portfolioLabel('Something else')).toBe('Something else');
    });
  });

  describe('safeSourceUrl', () => {
    it('should keep http and https links', () => {
      fixture.detectChanges();
      expect(component.safeSourceUrl('https://www.cgiar.org/')).toBe('https://www.cgiar.org/');
      expect(component.safeSourceUrl('http://www.cgiar.org/')).toBe('http://www.cgiar.org/');
    });

    it('should refuse a javascript or data URL instead of rendering a dead link', () => {
      // The value is typed in the admin panel. Angular would bind it as
      // `unsafe:javascript:…`, which looks like a working link and is not.
      fixture.detectChanges();
      expect(component.safeSourceUrl('javascript:alert(1)')).toBeNull();
      expect(component.safeSourceUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('should refuse anything that is not a URL at all', () => {
      fixture.detectChanges();
      expect(component.safeSourceUrl('www.cgiar.org')).toBeNull();
      expect(component.safeSourceUrl('   ')).toBeNull();
      expect(component.safeSourceUrl(null)).toBeNull();
    });
  });

  describe('the rendered source line', () => {
    const withProvenance = [
      {
        term: 'Impact Area',
        definition: 'A definition',
        source: 'CGIAR 2025-2030 Portfolio Narrative',
        sourceUrl: 'https://www.cgiar.org/',
        referenceDate: '2025-01-15',
        portfolios: []
      },
      { term: 'Plain term', definition: 'No provenance', portfolios: [] }
    ];

    beforeEach(() => {
      mockService.getGlossary.mockReturnValue(of(withProvenance));
      fixture.detectChanges();
      // These fixtures carry no portfolio, so the default filter would hide
      // them; the assertions below are about the source line, not the filter.
      showAllPortfolios();
      fixture.detectChanges();
    });

    it('should not pad the link with whitespace the underline would paint', () => {
      // A line break inside the <a> in the template becomes whitespace inside the
      // anchor, and the underline extends over it: the link read as
      // "_ CGIAR 2025-2030 Portfolio Narrative _" on the published page.
      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.card-source a');
      expect(link).toBeTruthy();
      expect(link.textContent).toBe('CGIAR 2025-2030 Portfolio Narrative');
      expect(link.getAttribute('href')).toBe('https://www.cgiar.org/');
      expect(link.getAttribute('rel')).toBe('noopener');
    });

    it('should read as one sentence with the date', () => {
      const line: HTMLElement = fixture.nativeElement.querySelector('.card-source');
      expect(line.textContent.replace(/\s+/g, ' ').trim()).toBe('Source: CGIAR 2025-2030 Portfolio Narrative · January 2025');
    });

    it('should show no source line at all for a term without provenance', () => {
      const lines = fixture.nativeElement.querySelectorAll('.card-source');
      expect(lines.length).toBe(1);
    });
  });

  describe('referenceDateLabel', () => {
    it('should print the month of the stored day, not of the day before', () => {
      // `new Date('2026-09-01')` is UTC midnight; formatted in Cali (UTC-5) it
      // prints 31 August 2026 — the wrong month for the reader.
      fixture.detectChanges();
      expect(component.referenceDateLabel('2026-09-01')).toBe('September 2026');
      expect(component.referenceDateLabel('2025-01-15')).toBe('January 2025');
      expect(component.referenceDateLabel('2024-12-31')).toBe('December 2024');
    });

    it('should return an unrecognised value untouched instead of inventing a date', () => {
      fixture.detectChanges();
      expect(component.referenceDateLabel('Sept 2026')).toBe('Sept 2026');
      expect(component.referenceDateLabel(null)).toBe('');
    });
  });
});
