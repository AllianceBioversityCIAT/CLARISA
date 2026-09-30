import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';

import { PanelAccessService, PanelAccessState } from '../../../../shared/services/access-admin/panel-access.service';
import { AdminGroup, groupsFor, onlyProtectedSection } from '../../admin-nav';

/**
 * Landing of the admin panel (`/clarisa-panel/manage`): the sections the
 * caller's roles open, and — when a guard sent them here — why the screen they
 * asked for did not open.
 *
 * When the roles open exactly ONE section (`onlyProtectedSection`), the list
 * is a detour: the home goes straight to it
 * (`replaceUrl`, so Back does not land on the list) — a Concepts-only member
 * opens Concepts. A `?denied=` note is dropped in that case: the
 * panel has no shared toast outlet, and that section is what the roles are
 * for anyway. Several sections, or a Super admin → the list. None → the
 * "no administration role yet" note (`isEmpty`).
 *
 * If `me/access` fails or times out, the home lists the whole panel, as before
 * role filtering (`groupsFor(null)`), and never redirects; the back still
 * enforces each permission.
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
      this.groups = state.status === 'ready' ? groupsFor(state.access) : state.status === 'error' ? groupsFor(null) : [];
      if (state.status === 'ready') this.goToOnlySection(state.access);
    });
  }

  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private goToOnlySection(access: Parameters<typeof onlyProtectedSection>[0]): void {
    const only = onlyProtectedSection(access);
    if (!only || this.redirecting) return;
    this.redirecting = true;
    this._router.navigate([only.link.route], { queryParams: only.queryParams, replaceUrl: true }).then(
      ok => {
        if (!ok) this.redirecting = false;
      },
      () => (this.redirecting = false)
    );
  }

  get loading(): boolean {
    return this.redirecting || this.state.status === 'loading' || this.state.status === 'idle';
  }

  /** Resolved, and the caller's roles open no section of the panel. */
  get isEmpty(): boolean {
    return this.state.status === 'ready' && this.groups.length === 0;
  }
}
