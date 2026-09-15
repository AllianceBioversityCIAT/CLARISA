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
          multi: true
        }
      ]
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

  describe('an expired session', () => {
    // Nothing handled the 401 before: the token stayed in place, the panel
    // stayed open and every screen failed on its own.
    it('logs the user out when the API rejects the session', () => {
      localStorage.setItem('token', 'expired-token');
      const logoutSpy = jest.spyOn(authService, 'logout').mockImplementation(() => undefined);

      httpClient.get(`${environment.apiUrl}api/glossary/admin/terms`).subscribe({
        error: () => undefined
      });

      httpMock
        .expectOne(`${environment.apiUrl}api/glossary/admin/terms`)
        .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      expect(logoutSpy).toHaveBeenCalled();
    });

    it('still reports the error to the caller', () => {
      localStorage.setItem('token', 'expired-token');
      jest.spyOn(authService, 'logout').mockImplementation(() => undefined);
      let seen: any = null;

      httpClient.get(`${environment.apiUrl}api/glossary/admin/terms`).subscribe({
        error: error => (seen = error)
      });

      httpMock.expectOne(`${environment.apiUrl}api/glossary/admin/terms`).flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(seen?.status).toBe(401);
    });

    // A 401 from the login call means "wrong credentials" and belongs to the
    // form; logging out there would reload the page and wipe its message.
    it('does not log out when the rejected call is the login itself', () => {
      const logoutSpy = jest.spyOn(authService, 'logout').mockImplementation(() => undefined);

      httpClient.post(`${environment.apiUrl}auth/login`, {}).subscribe({
        error: () => undefined
      });

      httpMock.expectOne(`${environment.apiUrl}auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(logoutSpy).not.toHaveBeenCalled();
    });

    it('leaves a successful call alone', () => {
      localStorage.setItem('token', 'good-token');
      const logoutSpy = jest.spyOn(authService, 'logout').mockImplementation(() => undefined);

      httpClient.get(`${environment.apiUrl}api/glossary`).subscribe();
      httpMock.expectOne(`${environment.apiUrl}api/glossary`).flush([]);

      expect(logoutSpy).not.toHaveBeenCalled();
    });
  });
});
