import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuardGuard implements CanActivate {
  miStorage: any;
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    this.miStorage = window.localStorage;
    if (!this.miStorage.hasOwnProperty('token')) {
      this.router.navigate(['landing-page/login']);
      return false;
    }

    // Having a token was the whole check, so a session that had already expired
    // still opened the panel: the screens loaded empty, every request answered
    // 401 and the user stayed inside with no way to tell what was wrong.
    if (this.authService.isSessionExpired()) {
      this.authService.logout();
      return false;
    }

    return true;
  }
}
