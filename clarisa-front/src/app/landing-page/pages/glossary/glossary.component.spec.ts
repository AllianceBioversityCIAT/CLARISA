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

  describe('pagination', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.pageSize = 2;
    });

    it('should slice the filtered terms per page', () => {
      expect(component.totalPages).toBe(2);
      expect(component.pagedTerms.map(t => t.term)).toEqual(['Action Area', 'Innovation']);

      component.goToPage(2);
      expect(component.pagedTerms.map(t => t.term)).toEqual(['Shared term', 'Orphan']);
    });

    it('should ignore out-of-range pages', () => {
      component.goToPage(0);
      expect(component.page).toBe(1);
      component.goToPage(99);
      expect(component.page).toBe(1);
    });

    it('should reset to page 1 when the search or the portfolio filter changes', () => {
      component.goToPage(2);
      component.searchText = 'a';
      component.onSearchChange();
      expect(component.page).toBe(1);

      component.goToPage(2);
      component.selectPortfolio(2);
      expect(component.page).toBe(1);
    });
  });
});
