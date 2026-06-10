import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { LoginGuardGuard } from './login-guard.guard';

describe('LoginGuardGuard', () => {
  let guard: LoginGuardGuard;
  let router: Router;
  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
    });
    guard = TestBed.inject(LoginGuardGuard);
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
});
