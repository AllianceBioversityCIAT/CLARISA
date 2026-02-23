import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { GeneralInterceptorService } from './auth-interceptor.service';
import { AuthService } from '../services/auth.service';
import { environment } from 'src/environments/environment';

describe('GeneralInterceptorService', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: GeneralInterceptorService,
          multi: true,
        },
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    const interceptor = TestBed.inject(GeneralInterceptorService);
    expect(interceptor).toBeTruthy();
  });

  it('should add Authorization header when token exists', () => {
    localStorage.setItem('token', 'test-token-123');

    httpClient.get(`${environment.apiUrl}some-endpoint`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}some-endpoint`);
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');
    req.flush({});
  });

  it('should not add Authorization header when no token and URL matches apiUrl', () => {
    localStorage.removeItem('token');

    httpClient.get(`${environment.apiUrl}some-endpoint`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}some-endpoint`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
