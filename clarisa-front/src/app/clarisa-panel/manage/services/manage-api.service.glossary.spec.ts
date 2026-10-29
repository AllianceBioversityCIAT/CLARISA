import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';

import { CreateGlossaryTermBody, GlossaryAdminTerm, ManageApiService } from './manage-api.service';

/**
 * Contract of the admin panel with `api/glossary/admin/*` (2026-10-29): verb,
 * full URL and body of the ten calls the panel makes today.
 */
describe('ManageApiService — glossary admin contract', () => {
  let service: ManageApiService;
  let httpMock: HttpTestingController;
  const admin = `${environment.apiUrl}api/glossary/admin`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ManageApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getGlossaryTerms: GET terms?show=all by default', () => {
    service.getGlossaryTerms().subscribe();
    const req = httpMock.expectOne(r => r.url === `${admin}/terms`);
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).toBe(`${admin}/terms?show=all`);
    req.flush([]);
  });

  it('getGlossaryTerms: forwards show=active|inactive', () => {
    service.getGlossaryTerms('inactive').subscribe();
    const req = httpMock.expectOne(r => r.url === `${admin}/terms`);
    expect(req.request.urlWithParams).toBe(`${admin}/terms?show=inactive`);
    req.flush([]);
  });

  it('createGlossaryTerm: POST terms with the body as is', () => {
    const body: CreateGlossaryTermBody = { term: 'T', definition: 'D', portfolio_ids: [2], group_of: 4 };
    service.createGlossaryTerm(body).subscribe();
    const req = httpMock.expectOne(`${admin}/terms`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('updateGlossaryTerm: PATCH terms/:id', () => {
    service.updateGlossaryTerm(7, { definition: 'new' }).subscribe();
    const req = httpMock.expectOne(`${admin}/terms/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ definition: 'new' });
    req.flush({});
  });

  it('splitGlossaryTerm: POST terms/:id/versions', () => {
    const body = { portfolio_ids: [3], definition: 'v2 wording' } as any;
    service.splitGlossaryTerm(7, body).subscribe();
    const req = httpMock.expectOne(`${admin}/terms/7/versions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('mergeGlossaryTerm: POST terms/:id/merge with { into_id }', () => {
    service.mergeGlossaryTerm(7, 9).subscribe();
    const req = httpMock.expectOne(`${admin}/terms/7/merge`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ into_id: 9 });
    req.flush({});
  });

  it('groupGlossaryTerm: POST terms/:id/group with { into_id }', () => {
    service.groupGlossaryTerm(7, 9).subscribe();
    const req = httpMock.expectOne(`${admin}/terms/7/group`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ into_id: 9 });
    req.flush({});
  });

  it('ungroupGlossaryTerm: DELETE terms/:id/group, no body', () => {
    service.ungroupGlossaryTerm(7).subscribe();
    const req = httpMock.expectOne(`${admin}/terms/7/group`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toBeNull();
    req.flush({});
  });

  it('setGlossaryTermStatus: PATCH terms/:id/status with { is_active }', () => {
    service.setGlossaryTermStatus(7, false).subscribe();
    const req = httpMock.expectOne(`${admin}/terms/7/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ is_active: false });
    req.flush({});
  });

  it('previewGlossaryBulk: POST bulk/preview', () => {
    const body = { rows: [{ term: 'A', definition: 'B' }], on_conflict: 'skip' } as any;
    service.previewGlossaryBulk(body).subscribe();
    const req = httpMock.expectOne(`${admin}/bulk/preview`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('importGlossaryBulk: POST bulk/import', () => {
    const body = { rows: [{ term: 'A', definition: 'B' }], on_conflict: 'update' } as any;
    service.importGlossaryBulk(body).subscribe();
    const req = httpMock.expectOne(`${admin}/bulk/import`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('there is no front method for PATCH terms/:id/editorial-status (pinned as-is)', () => {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service)).filter(name => /glossary/i.test(name));
    expect(methods.sort()).toEqual(
      [
        'createGlossaryTerm',
        'getGlossaryTerms',
        'groupGlossaryTerm',
        'importGlossaryBulk',
        'mergeGlossaryTerm',
        'previewGlossaryBulk',
        'setGlossaryTermStatus',
        'splitGlossaryTerm',
        'ungroupGlossaryTerm',
        'updateGlossaryTerm'
      ].sort()
    );
    expect(methods.some(name => /editorial/i.test(name))).toBe(false);
  });

  it('GlossaryAdminTerm and CreateGlossaryTermBody carry no editorial_status / replaced_by_id (type level)', () => {
    const base = { term: 'T', definition: 'D' };
    // @ts-expect-error pinned as-is: the create body has no editorial_status
    const body: CreateGlossaryTermBody = { ...base, editorial_status: 'draft' };
    // @ts-expect-error pinned as-is: the admin term has no editorial_status
    const key: keyof GlossaryAdminTerm = 'editorial_status';
    // @ts-expect-error pinned as-is: the admin term has no replaced_by_id
    const key2: keyof GlossaryAdminTerm = 'replaced_by_id';
    expect([body, key, key2]).toBeTruthy();
  });
});
