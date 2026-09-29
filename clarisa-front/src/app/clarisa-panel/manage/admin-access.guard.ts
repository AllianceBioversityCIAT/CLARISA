import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PanelAccessService } from '../../shared/services/access-admin/panel-access.service';
import { adminLinkFor, canOpenLink } from './admin-nav';

export const ADMIN_HOME = '/clarisa-panel/manage';

/**
 * Opens a panel screen only to whoever the sidebar would show it to: same map
 * (`admin-nav.ts`), same `me/access`. Anyone else lands on the panel home with
 * the reason in `?denied=` (the section's name) or `?denied=error` when the
 * access could not be read. The back rejects the calls anyway; this keeps a
 * person from opening a screen that can only fail.
 *
 * Runs after `LoginGuardGuard`, which handles the missing or expired session.
 */
@Injectable({ providedIn: 'root' })
export class AdminAccessGuard implements CanActivate {
  constructor(
    private readonly _access: PanelAccessService,
    private readonly _router: Router
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    const link = adminLinkFor(state.url);

    return this._access.resolved().pipe(
      map(access => {
        if (!link) return true;
        if (canOpenLink(link, access)) return true;
        return this._router.createUrlTree([ADMIN_HOME], { queryParams: { denied: access ? link.label : 'error' } });
      })
    );
  }
}
