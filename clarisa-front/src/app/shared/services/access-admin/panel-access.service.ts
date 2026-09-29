import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, filter, map, take, tap } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { AccessAdminApiService, MeAccess } from './access-admin-api.service';

export type PanelAccessState = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; access: MeAccess } | { status: 'error' };

/**
 * What the signed-in user may open in the admin panel (`GET api/users/me/access`),
 * fetched once per session and shared by the sidebar and the route guards.
 *
 * The cache is keyed by the token: signing in again (new token) or signing
 * out (no token) invalidates it on the next read, without the login screen
 * having to know this service exists.
 */
@Injectable({ providedIn: 'root' })
export class PanelAccessService {
  private readonly _state = new BehaviorSubject<PanelAccessState>({ status: 'idle' });
  private _token: string | null = null;

  readonly state$ = this._state.asObservable();

  constructor(
    private readonly _api: AccessAdminApiService,
    private readonly _auth: AuthService
  ) {}

  get snapshot(): PanelAccessState {
    return this._state.value;
  }

  /** Starts the fetch if nothing valid is cached. Safe to call on every render. */
  ensure(): void {
    const token = this._auth.localStorageToken;
    if (!token) {
      this.clear();
      return;
    }
    const current = this._state.value.status;
    if (token === this._token && (current === 'loading' || current === 'ready')) return;
    this.load(token);
  }

  /** Forces a new fetch (the Retry of the sidebar). */
  reload(): void {
    const token = this._auth.localStorageToken;
    if (token) this.load(token);
    else this.clear();
  }

  clear(): void {
    this._token = null;
    this._state.next({ status: 'idle' });
  }

  /** The access once resolved; `null` when there is no session or it failed. */
  resolved(): Observable<MeAccess | null> {
    this.ensure();
    return this._state.pipe(
      filter(state => state.status !== 'loading'),
      take(1),
      map(state => (state.status === 'ready' ? state.access : null))
    );
  }

  private load(token: string): void {
    this._token = token;
    this._state.next({ status: 'loading' });
    this._api
      .me()
      .pipe(
        tap(access => {
          if (this._token === token) this._state.next({ status: 'ready', access: { ...access, permissions: access.permissions ?? [] } });
        }),
        catchError(() => {
          if (this._token === token) this._state.next({ status: 'error' });
          return of(null);
        })
      )
      .subscribe();
  }
}
