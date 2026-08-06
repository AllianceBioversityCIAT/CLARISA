import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';

import { InstitutionLifecycleService } from './institution-lifecycle.service';

describe('InstitutionLifecycleService', () => {
  let service: InstitutionLifecycleService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(InstitutionLifecycleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should omit the status param when listing all institutions', () => {
    service.getInstitutions().subscribe();
    const req = httpMock.expectOne(`${baseUrl}api/institutions`);
    expect(req.request.params.get('status')).toBeNull();
    req.flush([]);
  });

  it('should forward the status param when filtering', () => {
    service.getInstitutions('ended').subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${baseUrl}api/institutions` && r.params.get('status') === 'ended',
    );
    req.flush([]);
  });

  it('should PATCH the lifecycle endpoint', () => {
    const body = { endDate: '2025-12-31', replacedByInstitutionId: 9876 };
    service.updateLifecycle(1234, body).subscribe();
    const req = httpMock.expectOne(`${baseUrl}api/institutions/1234/lifecycle`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(body);
    req.flush({ code: 1234 });
  });
});
