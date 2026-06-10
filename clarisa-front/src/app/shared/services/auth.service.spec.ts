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
      imports: [HttpClientTestingModule, RouterTestingModule],
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

      service.userAuth(body).subscribe((res) => {
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
        writable: true,
      });

      localStorage.setItem('token', 'some-token');
      localStorage.setItem('user', '{}');

      service.logout();

      expect(navigateSpy).toHaveBeenCalledWith(['landing-page/login']);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });
});
