import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { UserAuth } from '../interfaces/user-auth';
import { UserBasicInfo } from '../interfaces/user-basic-info';

/**
 * Why the user is looking at the login screen.
 *
 * Travels as `?reason=session-expired` so the reason survives the redirect —and
 * a reload— instead of living in a variable that the navigation itself destroys.
 * The login screen is the only reader.
 */
export const SESSION_EXPIRED = 'session-expired';

/** Where a closed session lands. */
export const LOGIN_ROUTE = 'landing-page/login';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  inLogin = true;
  apiBaseUrl = environment.apiUrl + 'auth/';
  constructor(
    public http: HttpClient,
    private router: Router
  ) {}

  set localStorageToken(token: string) {
    localStorage.setItem('token', token);
  }

  get localStorageToken() {
    return localStorage.getItem('token');
  }

  set localStorageUser(user: {}) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  get localStorageUser(): UserBasicInfo {
    // console.log('localStorageUser');
    return JSON.parse(localStorage.getItem('user'));
  }

  userAuth(body: UserAuth) {
    return this.http.post<any>(`${this.apiBaseUrl}login`, body);
  }

  /**
   * Ends the session: the stored credentials go first, then the redirect.
   *
   * The order used to be the other way around — navigate, reload, clear — and
   * the reload raced the clear: whether the browser took the new page with the
   * token still in place depended on timing.
   *
   * `reason` is what the login screen needs to tell an expiry from someone
   * arriving on their own: without it the app dropped the user on a blank form
   * mid-task and said nothing, which reads as being thrown out. It is opt-in on
   * purpose — pressing «Sign out» is not an incident and carries no message.
   */
  logout(reason?: typeof SESSION_EXPIRED) {
    localStorage.clear();

    if (reason) {
      this.router.navigate([LOGIN_ROUTE], { queryParams: { reason } });
      return;
    }

    this.router.navigate([LOGIN_ROUTE]);
  }

  /**
   * Whether the stored session is past its expiry.
   *
   * Only says `true` when it can **prove** it: the token is there, its payload
   * is readable and its `exp` is in the past. A token in an unexpected shape is
   * not treated as expired — the API is the authority on that, and a 401 sends
   * the user out anyway. Guessing here would log out a valid user because of a
   * format change.
   */
  isSessionExpired(): boolean {
    const expiry = this.tokenExpiry(this.localStorageToken);
    return expiry !== null && expiry <= Date.now();
  }

  /** `exp` of a JWT in milliseconds, or `null` when it cannot be read. */
  private tokenExpiry(token: string | null): number | null {
    const payload = (token ?? '').split('.')[1];
    if (!payload) {
      return null;
    }

    try {
      const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return typeof claims?.exp === 'number' ? claims.exp * 1000 : null;
    } catch {
      return null;
    }
  }
}
