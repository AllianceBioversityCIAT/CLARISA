import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('localStorageToken', () => {
    it('should set and get token from localStorage', () => {
      service.localStorageToken = 'my-token';
      expect(service.localStorageToken).toBe('my-token');
      expect(localStorage.getItem('token')).toBe('my-token');
    });

    it('should return null when no token is set', () => {
      expect(service.localStorageToken).toBeNull();
    });
  });

  describe('localStorageUser', () => {
    it('should set and get user from localStorage as JSON', () => {
      const user = { id: 1, user_name: 'admin', email: 'admin@test.com' };
      service.localStorageUser = user;
      expect(service.localStorageUser).toEqual(user);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(user));
    });

    it('should return null when no user is set', () => {
      expect(service.localStorageUser).toBeNull();
    });
  });

  describe('userAuth', () => {
    it('should POST credentials to the login endpoint', () => {
      const body = { login: 'admin', password: 'secret' };
      const mockResponse = { token: 'abc123' };

      service.userAuth(body).subscribe(res => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });
  });

  describe('logout', () => {
    it('should navigate to login page and clear localStorage', () => {
      const navigateSpy = jest.spyOn(router, 'navigate');
      // window.location.reload cannot be tested directly; mock it
      const reloadMock = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { ...window.location, reload: reloadMock },
        writable: true
      });

      localStorage.setItem('token', 'some-token');
      localStorage.setItem('user', '{}');

      service.logout();

      expect(navigateSpy).toHaveBeenCalledWith(['landing-page/login']);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('isSessionExpired', () => {
    /** A JWT shaped like the real one: only the payload has to be readable. */
    const tokenExpiringIn = (seconds: number) => {
      const payload = btoa(JSON.stringify({ login: 'y.zuniga', sub: 1, exp: Math.floor(Date.now() / 1000) + seconds }))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      return `header.${payload}.signature`;
    };

    it('reports a token whose expiry has passed', () => {
      service.localStorageToken = tokenExpiringIn(-3600);
      expect(service.isSessionExpired()).toBe(true);
    });

    it('does not report a token that is still valid', () => {
      service.localStorageToken = tokenExpiringIn(3600);
      expect(service.isSessionExpired()).toBe(false);
    });

    // It only says yes when it can prove it: the API is the authority, and a
    // 401 takes the user out anyway. Guessing would log out a valid session
    // because of a payload shape nobody announced.
    it('does not report a token it cannot read', () => {
      service.localStorageToken = 'not-a-jwt';
      expect(service.isSessionExpired()).toBe(false);

      service.localStorageToken = 'header.%%%.signature';
      expect(service.isSessionExpired()).toBe(false);
    });

    it('does not report a token without an expiry claim', () => {
      const payload = btoa(JSON.stringify({ login: 'y.zuniga' })).replace(/=/g, '');
      service.localStorageToken = `header.${payload}.signature`;
      expect(service.isSessionExpired()).toBe(false);
    });

    it('does not report a missing session as expired', () => {
      expect(service.isSessionExpired()).toBe(false);
    });
  });

  describe('logout order', () => {
    // The credentials used to be wiped after the redirect had been asked for,
    // so whether the new page saw the old token depended on timing.
    it('clears the session before navigating', () => {
      localStorage.setItem('token', 'some-token');
      let tokenWhenNavigating: string | null = 'not-called';
      jest.spyOn(router, 'navigate').mockImplementation(() => {
        tokenWhenNavigating = localStorage.getItem('token');
        return Promise.resolve(true);
      });

      service.logout();

      expect(tokenWhenNavigating).toBeNull();
    });
  });
});
