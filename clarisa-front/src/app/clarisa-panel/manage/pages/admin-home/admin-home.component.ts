import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';

import { PanelAccessService, PanelAccessState } from '../../../../shared/services/access-admin/panel-access.service';
import { AdminGroup, AdminLink, groupsFor } from '../../admin-nav';

/** The one link the caller can open, or `null` when there are none or several. */
export function onlySection(groups: AdminGroup[]): AdminLink | null {
  const links = groups.flatMap(group => group.links);
  return links.length === 1 ? links[0] : null;
}

/**
 * Landing of the admin panel (`/clarisa-panel/manage`): the sections the
 * caller's roles open, and — when a guard sent them here — why the screen they
 * asked for did not open.
 *
 * With exactly ONE section open, the list is a detour: the home goes straight
 * to it (`replaceUrl`, so Back does not land on a one-card page). A `?denied=`
 * note is dropped in that case — the panel has no shared toast outlet, and the
 * section that opens is the only one the roles allow anyway.
 */
@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.scss']
})
export class AdminHomeComponent implements OnInit, OnDestroy {
  state: PanelAccessState = { status: 'idle' };
  denied: string | null = null;
  groups: AdminGroup[] = [];
  /** Going to the only section: the skeleton stays, so the one-card list never flashes. */
  redirecting = false;

  private _sub?: Subscription;

  constructor(
    private readonly _access: PanelAccessService,
    private readonly _route: ActivatedRoute,
    private readonly _router: Router
  ) {}

  ngOnInit(): void {
    this._access.ensure();
    this._sub = combineLatest([this._access.state$, this._route.queryParamMap]).subscribe(([state, params]) => {
      this.state = state;
      this.denied = params.get('denied');
      this.groups = state.status === 'ready' ? groupsFor(state.access) : [];
      this.goToOnlySection();
    });
  }

  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private goToOnlySection(): void {
    const link = onlySection(this.groups);
    if (!link || this.redirecting) return;
    this.redirecting = true;
    const queryParams = link.children?.length ? link.children[0].queryParams : undefined;
    this._router.navigate([link.route], { queryParams, replaceUrl: true }).then(
      ok => {
        if (!ok) this.redirecting = false;
      },
      () => (this.redirecting = false)
    );
  }

  get loading(): boolean {
    return this.redirecting || this.state.status === 'loading' || this.state.status === 'idle';
  }

  get failed(): boolean {
    return this.state.status === 'error';
  }

  get isEmpty(): boolean {
    return this.state.status === 'ready' && this.groups.length === 0;
  }

  retry(): void {
    this._access.reload();
  }
}
