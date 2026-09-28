import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { ConceptListComponent, SEARCH_DEBOUNCE, SEARCH_SETTLE } from './concept-list.component';
import { GlobalConceptsApiService } from '../../../../../shared/services/global-concepts/global-concepts-api.service';

describe('ConceptListComponent', () => {
  let component: ConceptListComponent;
  let fixture: ComponentFixture<ConceptListComponent>;
  let api: any;
  let router: any;
  let params: BehaviorSubject<any>;
  /** The URL as the router would hold it after each navigation. */
  let url: Record<string, string>;

  const concepts = [
    {
      term_id: 2374,
      preferred_label: 'Outcome',
      preferred_labels: [],
      alternative_labels: [],
      short_definition: 'A change in behaviour',
      definition: 'Long definition',
      meliaf_function: ['monitoring'],
      meliaf_phase_primary: 'implementation',
      meliaf_phase_also: [],
      term_type: 'core',
      status: 'approved',
      version: '1.0',
      date_modified: '2026-09-01',
      replaced_by: null
    },
    {
      term_id: 30,
      preferred_label: 'Baseline',
      preferred_labels: [],
      alternative_labels: [],
      short_definition: null,
      definition: 'Starting point',
      meliaf_function: ['evaluation'],
      meliaf_phase_primary: 'design',
      meliaf_phase_also: [],
      term_type: 'core',
      status: 'approved',
      version: '1.0',
      date_modified: '2026-09-20',
      replaced_by: null
    },
    {
      term_id: 12,
      preferred_label: 'Old outcome',
      preferred_labels: [],
      alternative_labels: [],
      short_definition: null,
      definition: 'Superseded',
      meliaf_function: ['monitoring'],
      meliaf_phase_primary: null,
      meliaf_phase_also: [],
      term_type: null,
      status: 'deprecated',
      version: '1.1',
      date_modified: '2026-09-25',
      replaced_by: { term_id: 2374, uri: 'https://x/2374', preferred_label: 'Outcome' }
    }
  ];

  beforeEach(async () => {
    url = {};
    params = new BehaviorSubject(convertToParamMap({}));
    api = {
      schemes: jest.fn().mockReturnValue(of([{ code: 'meliaf', title: 'MELIAF' }])),
      scheme: jest.fn().mockReturnValue(of({ code: 'meliaf', title: 'MELIAF concepts', description: 'Official', license: 'CC BY 4.0' })),
      lists: jest.fn().mockReturnValue(
        of({
          meliaf_function: [
            { value: 'monitoring', label: 'Monitoring' },
            { value: 'evaluation', label: 'Evaluation' }
          ],
          meliaf_phase: [{ value: 'implementation', label: 'Implementation' }],
          term_type: [{ value: 'core', label: 'Core term' }]
        })
      ),
      // The back answers a search with its own matches; this stand-in matches the label.
      concepts: jest.fn((scheme: string, query: any) =>
        of(query?.q ? concepts.filter(c => c.preferred_label.toLowerCase().includes(String(query.q).toLowerCase())) : concepts)
      ),
      exportUrl: jest.fn((scheme: string, format: string) => `https://api/${scheme}/export?format=${format}`),
      suggest: jest.fn()
    };
    // A router that behaves like the real one for this page: merge the params, emit them.
    router = {
      navigate: jest.fn((_: unknown, extras: any) => {
        const next = { ...url };
        for (const [k, v] of Object.entries(extras.queryParams ?? {})) {
          if (v === null || v === undefined) delete next[k];
          else next[k] = String(v);
        }
        url = next;
        params.next(convertToParamMap(url));
        return Promise.resolve(true);
      })
    };

    await TestBed.configureTestingModule({
      declarations: [ConceptListComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: GlobalConceptsApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParamMap: params } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConceptListComponent);
    component = fixture.componentInstance;
  });

  const labels = () => component.results.map(c => c.preferred_label);
  const facet = (code: string) => component.facets.find(f => f.code === code);

  it('downloads the whole published set once and hides deprecated by default', () => {
    fixture.detectChanges();
    expect(api.concepts).toHaveBeenCalledTimes(1);
    expect(api.concepts).toHaveBeenCalledWith('meliaf', {});
    expect(labels()).toEqual(['Baseline', 'Outcome']);
    expect(component.total).toBe(2);
    expect(fixture.nativeElement.querySelector('.gc-results__head').textContent).toContain('2 of 2 concepts');
  });

  it('computes facet counts from the result and ORs values of one facet', () => {
    fixture.detectChanges();
    expect(facet('meliaf_function')?.options.map(o => [o.value, o.count])).toEqual([
      ['monitoring', 1],
      ['evaluation', 1]
    ]);
    component.toggleValue('meliaf_function', 'monitoring');
    expect(labels()).toEqual(['Outcome']);
    // Counts of the same facet ignore its own selection: evaluation still offers 1 more.
    expect(facet('meliaf_function')?.options.find(o => o.value === 'evaluation')?.count).toBe(1);
    component.toggleValue('meliaf_function', 'evaluation');
    expect(labels()).toEqual(['Baseline', 'Outcome']);
  });

  it('ANDs different facets', () => {
    fixture.detectChanges();
    component.toggleValue('term_type', 'core');
    component.toggleValue('meliaf_phase', 'implementation');
    expect(labels()).toEqual(['Outcome']);
    expect(component.selected).toBe(2);
  });

  it('writes the state to the URL and reads it back (shareable, back button)', () => {
    fixture.detectChanges();
    component.toggleValue('meliaf_function', 'monitoring');
    component.toggleValue('meliaf_function', 'evaluation');
    component.setSort('updated');
    expect(url).toEqual({ meliaf_function: 'monitoring,evaluation', sort: 'updated' });

    // The back button: the router emits the previous URL and the page follows it.
    params.next(convertToParamMap({ meliaf_function: 'monitoring' }));
    expect(component.state.facets.meliaf_function).toEqual(['monitoring']);
    expect(component.state.sort).toBe('best');
    expect(labels()).toEqual(['Outcome']);
  });

  it('opens a shared link with its filters applied', () => {
    params.next(convertToParamMap({ q: 'outcome', deprecated: '1', sort: 'za' }));
    fixture.detectChanges();
    expect(component.q).toBe('outcome');
    expect(labels()).toEqual(['Outcome', 'Old outcome']);
    expect(component.chips.map(c => c.label)).toEqual(['"outcome"', 'Including deprecated']);
  });

  it('clear all removes filters and search but keeps the sort', () => {
    fixture.detectChanges();
    component.onQueryInput('out');
    component.toggleValue('term_type', 'core');
    component.toggleDeprecated(true);
    component.setSort('za');
    component.clearAll();
    expect(component.q).toBe('');
    expect(component.hasFilters).toBe(false);
    expect(url).toEqual({ sort: 'za' });
    expect(labels()).toEqual(['Outcome', 'Baseline']);
  });

  it('sorts A to Z, Z to A and recently updated', () => {
    fixture.detectChanges();
    component.toggleDeprecated(true);
    expect(labels()).toEqual(['Baseline', 'Old outcome', 'Outcome']);
    component.setSort('za');
    expect(labels()).toEqual(['Outcome', 'Old outcome', 'Baseline']);
    component.setSort('updated');
    expect(labels()).toEqual(['Old outcome', 'Baseline', 'Outcome']);
  });

  it('matches while typing and asks the back once after the pause', fakeAsync(() => {
    fixture.detectChanges();
    api.concepts.mockClear();
    component.onQueryInput('bas');
    expect(labels()).toEqual(['Baseline']);
    component.onQueryInput('outc');
    expect(labels()).toEqual(['Outcome']);
    tick(SEARCH_DEBOUNCE - 1);
    expect(api.concepts).not.toHaveBeenCalled();
    tick(1);
    expect(url['q']).toBe('outc');
    expect(api.concepts).toHaveBeenCalledTimes(1);
    expect(api.concepts).toHaveBeenCalledWith('meliaf', { q: 'outc', track: 0 });
    // A URL write replaces the entry: typing does not flood the history.
    expect(router.navigate.mock.calls[router.navigate.mock.calls.length - 1][1].replaceUrl).toBe(true);
    tick(SEARCH_SETTLE);
  }));

  describe('the search box and its URL echo', () => {
    it('keeps a trailing space while typing: the echo of "soil" does not rewrite "soil "', fakeAsync(() => {
      fixture.detectChanges();
      component.onQueryInput('soil ');
      tick(SEARCH_DEBOUNCE);
      expect(url['q']).toBe('soil');
      expect(component.q).toBe('soil ');
      tick(SEARCH_SETTLE);
    }));

    it('does not cut a long paste in the box to the 200 characters the URL carries', fakeAsync(() => {
      fixture.detectChanges();
      const long = 'a'.repeat(250);
      component.onQueryInput(long);
      tick(SEARCH_DEBOUNCE);
      expect(url['q']).toHaveLength(200);
      expect(component.q).toBe(long);
      tick(SEARCH_SETTLE);
    }));

    it('still follows the URL when it really changes (back button, shared link)', fakeAsync(() => {
      fixture.detectChanges();
      component.onQueryInput('soil ');
      tick(SEARCH_DEBOUNCE);
      params.next(convertToParamMap({ q: 'water' }));
      expect(component.q).toBe('water');
      tick(SEARCH_SETTLE);
    }));
  });

  describe('usage hygiene', () => {
    const counted = () => api.concepts.mock.calls.filter(([, query]: [string, any]) => query?.q && query.track === undefined);
    const uncounted = () => api.concepts.mock.calls.filter(([, query]: [string, any]) => query?.q && query.track === 0);

    it('searches while typing with track=0 and counts once when the query settles', fakeAsync(() => {
      fixture.detectChanges();
      api.concepts.mockClear();
      component.onQueryInput('ou');
      tick(SEARCH_DEBOUNCE);
      component.onQueryInput('outco');
      tick(SEARCH_DEBOUNCE);
      component.onQueryInput('outcome');
      tick(SEARCH_DEBOUNCE);
      expect(uncounted().length).toBeGreaterThan(0);
      expect(counted()).toEqual([]);

      tick(SEARCH_SETTLE - SEARCH_DEBOUNCE - 1);
      expect(counted()).toEqual([]);
      tick(1);
      expect(counted()).toEqual([['meliaf', { q: 'outcome' }]]);
    }));

    it('counts on Enter or blur at once, and not again for the same query', fakeAsync(() => {
      fixture.detectChanges();
      api.concepts.mockClear();
      component.onQueryInput('baseline ');
      component.commitSearch();
      expect(counted()).toEqual([['meliaf', { q: 'baseline' }]]);

      component.commitSearch();
      tick(SEARCH_SETTLE);
      expect(counted()).toHaveLength(1);
    }));

    it('never counts an empty search', fakeAsync(() => {
      fixture.detectChanges();
      api.concepts.mockClear();
      component.onQueryInput('   ');
      component.commitSearch();
      tick(SEARCH_SETTLE);
      expect(counted()).toEqual([]);
    }));
  });

  it('adds what the back found by a hidden search term', fakeAsync(() => {
    api.concepts.mockImplementation((_: string, query: any) => of(query?.q ? [concepts[1]] : concepts));
    fixture.detectChanges();
    component.onQueryInput('starting-synonym');
    expect(labels()).toEqual([]);
    tick(SEARCH_DEBOUNCE);
    expect(labels()).toEqual(['Baseline']);
    tick(SEARCH_SETTLE);
  }));

  it('lets the back decide once it answers, in its order, and marks what it matched', fakeAsync(() => {
    api.concepts.mockImplementation((_: string, query: any) =>
      of(
        query?.q
          ? [
              { ...concepts[1], match: { tier: 'similar', score: 0.8, highlights: [{ field: 'preferred_label', ranges: [[0, 4]] }] } },
              { ...concepts[0], match: { tier: 'similar', score: 0.75, highlights: [] } }
            ]
          : concepts
      )
    );
    fixture.detectChanges();
    component.onQueryInput('basline');
    tick(SEARCH_DEBOUNCE);
    // Neither label contains "basline": only the back's similar-word answer finds them, in its order.
    expect(labels()).toEqual(['Baseline', 'Outcome']);
    fixture.detectChanges();
    const marks = [...fixture.nativeElement.querySelectorAll('mark.gc-hit')].map((m: HTMLElement) => m.textContent);
    expect(marks).toEqual(['Base']);
    tick(SEARCH_SETTLE);
  }));

  it('keeps the local match when the back search fails', fakeAsync(() => {
    api.concepts.mockImplementation((_: string, query: any) => (query?.q ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(concepts)));
    fixture.detectChanges();
    component.onQueryInput('outcome');
    tick(SEARCH_DEBOUNCE);
    expect(component.error).toBeNull();
    expect(labels()).toEqual(['Outcome']);
    tick(SEARCH_SETTLE);
  }));

  it('turns a failed load into a message and loads again on retry', () => {
    api.concepts.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 429 })));
    fixture.detectChanges();
    expect(component.loading).toBe(false);
    expect(component.error).toContain('Too many attempts');
    component.reload();
    expect(component.error).toBeNull();
    expect(labels()).toEqual(['Baseline', 'Outcome']);
  });

  it('says it is searching until the back answers, then suggests clearing filters or proposing the term', fakeAsync(() => {
    fixture.detectChanges();
    component.onQueryInput('zzz');
    fixture.detectChanges();
    // No false "nothing" while the back (which knows similar spellings) has not answered.
    expect(fixture.nativeElement.textContent).toContain('Searching…');
    expect(fixture.nativeElement.textContent).not.toContain('No concept matches');
    tick(SEARCH_DEBOUNCE);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('No concept matches "zzz"');
    expect(text).toContain('Clear all filters');
    expect(text).toContain('Propose "zzz"');
    tick(SEARCH_SETTLE);
  }));

  it('shows labels from the lists and the replacement of a deprecated concept', () => {
    params.next(convertToParamMap({ deprecated: '1' }));
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

  it('drops the facet values when the scheme changes', () => {
    fixture.detectChanges();
    component.toggleValue('term_type', 'core');
    component.switchScheme('prms');
    expect(url).toEqual({ scheme: 'prms' });
    expect(api.concepts).toHaveBeenLastCalledWith('prms', {});
  });
});
