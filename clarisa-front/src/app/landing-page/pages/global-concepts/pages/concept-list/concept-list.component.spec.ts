import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ConceptListComponent, SEARCH_DEBOUNCE } from './concept-list.component';
import { GlobalConceptsApiService } from '../../../../../shared/services/global-concepts/global-concepts-api.service';

describe('ConceptListComponent', () => {
  let component: ConceptListComponent;
  let fixture: ComponentFixture<ConceptListComponent>;
  let api: any;
  let router: any;

  const concepts = [
    {
      term_id: 2374,
      preferred_label: 'Outcome',
      short_definition: 'A change in behaviour',
      definition: 'Long definition',
      meliaf_function: ['monitoring'],
      meliaf_phase_primary: 'implementation',
      term_type: 'core',
      status: 'approved',
      version: '1.0',
      replaced_by: null
    },
    {
      term_id: 12,
      preferred_label: 'Old outcome',
      short_definition: null,
      definition: 'Superseded',
      meliaf_function: [],
      meliaf_phase_primary: null,
      term_type: null,
      status: 'deprecated',
      version: '1.1',
      replaced_by: { term_id: 2374, uri: 'https://x/2374', preferred_label: 'Outcome' }
    }
  ];

  beforeEach(async () => {
    api = {
      schemes: jest.fn().mockReturnValue(of([{ code: 'meliaf', title: 'MELIAF' }])),
      scheme: jest.fn().mockReturnValue(of({ code: 'meliaf', title: 'MELIAF concepts', description: 'Official', license: 'CC BY 4.0' })),
      // Shaped like the back really answers: an object keyed by list code.
      lists: jest.fn().mockReturnValue(
        of({
          meliaf_function: [{ value: 'monitoring', label: 'Monitoring' }],
          meliaf_phase: [{ value: 'implementation', label: 'Implementation' }],
          term_type: [{ value: 'core', label: 'Core term' }]
        })
      ),
      concepts: jest.fn().mockReturnValue(of(concepts)),
      exportUrl: jest.fn((scheme: string, format: string) => `https://api/${scheme}/export?format=${format}`),
      suggest: jest.fn()
    };
    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      declarations: [ConceptListComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: GlobalConceptsApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConceptListComponent);
    component = fixture.componentInstance;
  });

  const lastQuery = () => api.concepts.mock.calls[api.concepts.mock.calls.length - 1];

  it('opens on the meliaf scheme with approved concepts only', () => {
    fixture.detectChanges();
    expect(api.scheme).toHaveBeenCalledWith('meliaf');
    expect(api.lists).toHaveBeenCalledWith('meliaf');
    expect(lastQuery()).toEqual([
      'meliaf',
      { q: undefined, meliaf_function: undefined, meliaf_phase: undefined, term_type: undefined, status: 'approved' }
    ]);
    expect(component.concepts.length).toBe(2);
    expect(component.loading).toBe(false);
  });

  it('sends the facet value, not its label, and drops status when deprecated are included', () => {
    fixture.detectChanges();
    component.setFilter('meliaf_function', 'monitoring');
    expect(lastQuery()[1]).toEqual(expect.objectContaining({ meliaf_function: 'monitoring', status: 'approved' }));

    component.setFilter('term_type', 'core');
    component.toggleDeprecated(true);
    expect(lastQuery()[1]).toEqual(expect.objectContaining({ meliaf_function: 'monitoring', term_type: 'core', status: undefined }));
  });

  it('debounces typing into a single search with the trimmed q', fakeAsync(() => {
    fixture.detectChanges();
    api.concepts.mockClear();
    component.onQueryInput('out');
    component.onQueryInput('outc');
    component.onQueryInput(' outcome ');
    tick(SEARCH_DEBOUNCE - 1);
    expect(api.concepts).not.toHaveBeenCalled();
    tick(1);
    expect(api.concepts).toHaveBeenCalledTimes(1);
    expect(lastQuery()[1].q).toBe('outcome');
  }));

  it('clears every filter in one call', () => {
    fixture.detectChanges();
    component.setFilter('meliaf_phase', 'implementation');
    component.toggleDeprecated(true);
    component.clearFilters();
    expect(component.hasFilters).toBe(false);
    expect(lastQuery()[1]).toEqual(expect.objectContaining({ meliaf_phase: undefined, status: 'approved' }));
  });

  it('shows labels from the lists and the replacement of a deprecated concept', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Monitoring');
    expect(text).toContain('Core term');
    expect(text).toContain('replaced by');
    expect(text).toContain('TERM 2374 · v1.0');
  });

  it('builds the four export links from the service', () => {
    fixture.detectChanges();
    const links = Array.from(fixture.nativeElement.querySelectorAll('.gc-download__item')).map((a: any) => a.getAttribute('href'));
    expect(links).toEqual(['json', 'csv', 'skos', 'jsonld'].map(f => `https://api/meliaf/export?format=${f}`));
  });

  it('turns a failed search into a message and keeps searching afterwards', () => {
    api.concepts.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 429 })));
    fixture.detectChanges();
    expect(component.loading).toBe(false);
    expect(component.error).toContain('Too many attempts');

    component.search();
    expect(component.error).toBeNull();
    expect(component.concepts.length).toBe(2);
  });

  it('explains an empty result and offers to clear the filters', () => {
    api.concepts.mockReturnValue(of([]));
    fixture.detectChanges();
    component.setFilter('term_type', 'core');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No concept matches this search');
  });

  it('accepts the lists as a flat array too', () => {
    api.lists.mockReturnValue(of([{ list_code: 'term_type', value: 'core', label: 'Core term', sort: 1 }]));
    fixture.detectChanges();
    expect(component.options('term_type')).toEqual([{ value: 'core', label: 'Core term' }]);
  });
});
