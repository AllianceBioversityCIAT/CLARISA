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
      getPortfolios: jest.fn().mockReturnValue(of([{ code: 2, name: 'P22' }, { code: 3, name: 'P25' }]))
    };

    await TestBed.configureTestingModule({
      declarations: [GlossaryComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: GlossaryPageService, useValue: mockService }]
    }).compileComponents();

    fixture = TestBed.createComponent(GlossaryComponent);
    component = fixture.componentInstance;
  });

  it('should create and load terms and portfolios', () => {
    fixture.detectChanges();
    expect(component.terms.length).toBe(4);
    expect(component.portfolios.length).toBe(2);
    expect(component.loading).toBe(false);
  });

  it('should show every term by default', () => {
    fixture.detectChanges();
    expect(component.filteredTerms.length).toBe(4);
  });

  it('should filter by search text over term and definition (case-insensitive)', () => {
    fixture.detectChanges();
    component.searchText = 'ACTION';
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Action Area']);

    component.searchText = 'belongs';
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Shared term']);
  });

  it('should filter by portfolio id', () => {
    fixture.detectChanges();
    component.selectPortfolio(3);
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Innovation', 'Shared term']);
  });

  it('should combine search and portfolio filter', () => {
    fixture.detectChanges();
    component.selectPortfolio(3);
    component.searchText = 'shared';
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Shared term']);
  });

  it('should toggle the portfolio selection off when clicked twice', () => {
    fixture.detectChanges();
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
    expect(component.filteredTerms.map(t => t.term)).toEqual(['Action Area', 'Innovation', 'Orphan', 'Shared term']);
  });

  describe('letter filter', () => {
    beforeEach(() => {
      fixture.detectChanges();
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
});
