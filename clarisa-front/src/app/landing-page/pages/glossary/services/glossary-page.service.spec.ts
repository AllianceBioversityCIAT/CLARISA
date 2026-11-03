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

  it('getGlossary calls exactly GET api/glossary, with no params', () => {
    service.getGlossary().subscribe();
    const req = httpMock.expectOne(`${baseUrl}api/glossary`);
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).toBe(`${baseUrl}api/glossary`);
    expect(req.request.params.keys()).toEqual([]);
    // pinned as-is: the page never asks for `?version=2`, so it always gets v1.
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
        portfolios: [{ id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' }]
      }
    ];
    let received: GlossaryTerm[] | undefined;
    service.getGlossary().subscribe(terms => (received = terms));
    httpMock.expectOne(`${baseUrl}api/glossary`).flush(response);
    expect(received).toEqual(response);
    expect(Object.keys(received![0]).sort()).toEqual(
      ['alternativeLabels', 'definition', 'groupId', 'portfolios', 'referenceDate', 'source', 'sourceUrl', 'term', 'termId'].sort()
    );
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
