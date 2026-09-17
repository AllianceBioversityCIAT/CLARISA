import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';

import { MetricsService } from './metrics.service';
import { environment } from 'src/environments/environment';

describe('MetricsService', () => {
  let service: MetricsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MetricsService]
    });
    service = TestBed.inject(MetricsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('pide api/metrics y devuelve las cifras tal cual', () => {
    const payload = {
      institutions: 10630,
      projects: 1210,
      workPackages: 344,
      countries: 248,
      initiatives: 43,
      controlLists: 41,
      generatedAt: '2026-09-17T00:00:00.000Z'
    };

    let recibido: unknown;
    service.find().subscribe(m => (recibido = m));

    const req = http.expectOne(`${environment.apiUrl}api/metrics`);
    expect(req.request.method).toBe('GET');
    req.flush(payload);

    expect(recibido).toEqual(payload);
  });
});
