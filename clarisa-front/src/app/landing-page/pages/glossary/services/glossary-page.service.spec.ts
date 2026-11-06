import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';

import { GlossaryPageService, GlossaryTerm } from './glossary-page.service';

/**
 * Contract of the public glossary page with the API (2026-10-29). These tests
 * pin what the front sends and reads TODAY, so the v2 of the endpoint cannot
 * change either side without a test turning red.
 */
describe('GlossaryPageService — API contract', () => {
  let service: GlossaryPageService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(GlossaryPageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getGlossary calls exactly GET api/v2/glossary, with no params', () => {
    service.getGlossary().subscribe();
    const req = httpMock.expectOne(`${baseUrl}api/v2/glossary`);
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).toBe(`${baseUrl}api/v2/glossary`);
    expect(req.request.params.keys()).toEqual([]);
    // v2 = v1 + the taxonomy keys; the page never touches v1, which PRMS reads.
    expect(req.request.body).toBeNull();
    req.flush([]);
  });

  it('getGlossary hands the response through untouched, with every key the page reads', () => {
    const response: GlossaryTerm[] = [
      {
        termId: 5,
        term: 'Impact',
        alternativeLabels: ['IA'],
        groupId: 9,
        definition: '<b>Def</b>',
        source: 'Doc',
        sourceUrl: 'https://example.org',
        referenceDate: '2024-01-31',
        portfolios: [{ id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' }],
        termUri: 'https://api.clarisa.cgiar.org/meliaf-taxonomy/5',
        taxonomyStatus: 'approved'
      }
    ];
    let received: GlossaryTerm[] | undefined;
    service.getGlossary().subscribe(terms => (received = terms));
    httpMock.expectOne(`${baseUrl}api/v2/glossary`).flush(response);
    expect(received).toEqual(response);
    expect(Object.keys(received![0]).sort()).toEqual(
      [
        'alternativeLabels',
        'definition',
        'groupId',
        'portfolios',
        'referenceDate',
        'source',
        'sourceUrl',
        'term',
        'termId',
        'termUri',
        'taxonomyStatus'
      ].sort()
    );
  });

  it('searchSimilarTermIds asks the glossary collection of the taxonomy and keeps only the term ids, in order', () => {
    let received: number[] | undefined;
    service.searchSimilarTermIds('outcme').subscribe(ids => (received = ids));
    const req = httpMock.expectOne(r => r.url === `${baseUrl}api/meliaf-taxonomy/concepts`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('outcme');
    expect(req.request.params.get('collection')).toBe('glossary');
    req.flush([
      { term_id: 304, preferred_label: 'Outcome' },
      { term_id: '391', preferred_label: '2030 outcome' },
      { term_id: null, preferred_label: 'broken row' }
    ]);
    expect(received).toEqual([304, 391]);
  });

  it('searchSimilarTermIds encodes what the reader typed instead of pasting it into the URL', () => {
    service.searchSimilarTermIds('a&b=c').subscribe();
    const req = httpMock.expectOne(r => r.url === `${baseUrl}api/meliaf-taxonomy/concepts`);
    expect(req.request.params.get('q')).toBe('a&b=c');
    expect(req.request.params.keys()).toEqual(['q', 'collection']);
    req.flush([]);
  });

  it('searchSimilarTermIds treats an answer that is not a list as no matches', () => {
    let received: number[] | undefined;
    service.searchSimilarTermIds('x y z').subscribe(ids => (received = ids));
    httpMock.expectOne(r => r.url === `${baseUrl}api/meliaf-taxonomy/concepts`).flush({ message: 'unexpected' });
    expect(received).toEqual([]);
  });

  it('getPortfolios calls GET api/portfolios?show=all', () => {
    service.getPortfolios().subscribe();
    const req = httpMock.expectOne(`${baseUrl}api/portfolios?show=all`);
    expect(req.request.method).toBe('GET');
    // pinned as-is: `show=all` is part of the URL string, not an HttpParams entry.
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('getPortfolios hands through the fields the page reads: code, start_date, is_active, name (and `id`)', () => {
    const response = [{ id: 10, code: 3, name: 'CGIAR portfolio 2025-2030', start_date: 2025, is_active: 1, acronym: 'P25' }];
    let received: any[] | undefined;
    service.getPortfolios().subscribe(portfolios => (received = portfolios));
    httpMock.expectOne(`${baseUrl}api/portfolios?show=all`).flush(response);
    expect(received).toEqual(response);
  });

  it('exportUrl is a plain URL with the format as query string, no request', () => {
    expect(service.exportUrl('json')).toBe(`${baseUrl}api/glossary/export?format=json`);
    expect(service.exportUrl('csv')).toBe(`${baseUrl}api/glossary/export?format=csv`);
    expect(service.exportUrl('skos')).toBe(`${baseUrl}api/glossary/export?format=skos`);
  });

  it('GlossaryTerm has no editorialStatus / replacedByTermId (the page cannot type them)', () => {
    const term: GlossaryTerm = { term: 'x', definition: 'y', portfolios: [] };
    // @ts-expect-error pinned as-is: v1 contract has no editorialStatus
    const withStatus: GlossaryTerm = { ...term, editorialStatus: 'deprecated' as const };
    // @ts-expect-error pinned as-is: v1 contract has no replacedByTermId
    const withReplacement: GlossaryTerm = { ...term, replacedByTermId: 3 };
    expect(withStatus).toBeTruthy();
    expect(withReplacement).toBeTruthy();
  });
});
