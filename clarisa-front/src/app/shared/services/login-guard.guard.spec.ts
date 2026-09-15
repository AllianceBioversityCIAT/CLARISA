import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { LoginGuardGuard } from './login-guard.guard';
import { AuthService } from './auth.service';

describe('LoginGuardGuard', () => {
  let guard: LoginGuardGuard;
  let router: Router;
  let authService: AuthService;
  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule]
    });
    guard = TestBed.inject(LoginGuardGuard);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should return true when token exists in localStorage', () => {
    localStorage.setItem('token', 'test-token');

    const result = guard.canActivate(mockRoute, mockState);

    expect(result).toBe(true);
  });

  it('should return false and navigate to login when token is absent', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');

    const result = guard.canActivate(mockRoute, mockState);

    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['landing-page/login']);
  });

  // Having a token was the whole check, so an expired session opened the panel:
  // the screens loaded empty, every call answered 401 and nothing took the user
  // out.
  it('should refuse an expired session and end it', () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 })).replace(/=/g, '');
    localStorage.setItem('token', `header.${payload}.signature`);
    const logoutSpy = jest.spyOn(authService, 'logout');

    const result = guard.canActivate(mockRoute, mockState);

    expect(result).toBe(false);
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('should let a session that is still valid through', () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=/g, '');
    localStorage.setItem('token', `header.${payload}.signature`);

    expect(guard.canActivate(mockRoute, mockState)).toBe(true);
  });
});
