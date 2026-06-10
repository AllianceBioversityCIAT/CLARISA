import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';

import { ManageApiService } from './manage-api.service';

describe('ManageApiService', () => {
  let service: ManageApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ManageApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllMis', () => {
    it('should request active MIS by default', () => {
      service.getAllMis().subscribe();
      const req = httpMock.expectOne(`${baseUrl}api/mises`);
      expect(req.request.params.keys().length).toBe(0);
      req.flush([]);
    });

    it('should omit the show param for active', () => {
      service.getAllMis('active').subscribe();
      const req = httpMock.expectOne(`${baseUrl}api/mises`);
      expect(req.request.params.get('show')).toBeNull();
      req.flush([]);
    });

    it('should pass show=all when requested', () => {
      service.getAllMis('all').subscribe();
      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}api/mises` && r.params.get('show') === 'all',
      );
      req.flush([]);
    });

    it('should pass show=inactive when requested', () => {
      service.getAllMis('inactive').subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url === `${baseUrl}api/mises` &&
          r.params.get('show') === 'inactive',
      );
      req.flush([]);
    });
  });

  describe('usage endpoints', () => {
    it('should strip empty usage query params', () => {
      service
        .getApiKeyUsageSummary({
          from: '2024-01-01',
          to: '',
          mis_id: undefined,
          api_key_id: null as unknown as number,
          microservice_name: 'email-ms',
          granularity: 'day',
        })
        .subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}api/api-keys/usage/summary`,
      );
      expect(req.request.params.get('from')).toBe('2024-01-01');
      expect(req.request.params.get('to')).toBeNull();
      expect(req.request.params.get('mis_id')).toBeNull();
      expect(req.request.params.get('microservice_name')).toBe('email-ms');
      expect(req.request.params.get('granularity')).toBe('day');
      req.flush({ period: { from: '', to: '' }, totals: {}, by_mis: [], by_mis_microservice: [], by_microservice: [], keys: [], time_series: [] });
    });

    it('should omit api_key_id and mis_id from per-key usage requests', () => {
      service
        .getApiKeyUsage(42, {
          from: '2024-01-01',
          mis_id: 7,
          api_key_id: 99,
          granularity: 'week',
        })
        .subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}api/api-keys/42/usage`,
      );
      expect(req.request.params.get('from')).toBe('2024-01-01');
      expect(req.request.params.get('granularity')).toBe('week');
      expect(req.request.params.get('mis_id')).toBeNull();
      expect(req.request.params.get('api_key_id')).toBeNull();
      req.flush({
        period: { from: '', to: '' },
        api_key: {},
        totals: {},
        time_series: [],
        by_microservice: [],
        top_endpoints: [],
      });
    });
  });

  describe('api key mutations', () => {
    it('should create, revoke, rotate, and delete API keys', () => {
      service
        .createApiKey({
          name: 'Test',
          environment: 'DEV',
          scopes: ['read'],
        })
        .subscribe();
      httpMock
        .expectOne(`${baseUrl}api/api-keys/create`)
        .flush({ message: 'created' });

      service.revokeApiKey(1).subscribe();
      httpMock
        .expectOne(`${baseUrl}api/api-keys/1/revoke`)
        .flush({ message: 'revoked' });

      service.rotateApiKey(1).subscribe();
      httpMock
        .expectOne(`${baseUrl}api/api-keys/1/rotate`)
        .flush({ key: 'new-key' });

      service.deleteApiKey(1).subscribe();
      httpMock.expectOne(`${baseUrl}api/api-keys/1`).flush(null);
    });
  });
});
