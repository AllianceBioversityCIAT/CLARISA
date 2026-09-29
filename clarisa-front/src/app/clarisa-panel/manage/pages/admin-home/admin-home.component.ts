import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';

import { PanelAccessService, PanelAccessState } from '../../../../shared/services/access-admin/panel-access.service';
import { AdminGroup, groupsFor } from '../../admin-nav';

/**
 * Landing of the admin panel (`/clarisa-panel/manage`): the sections the
 * caller's roles open, and — when a guard sent them here — why the screen they
 * asked for did not open.
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

  private _sub?: Subscription;

  constructor(
    private readonly _access: PanelAccessService,
    private readonly _route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this._access.ensure();
    this._sub = combineLatest([this._access.state$, this._route.queryParamMap]).subscribe(([state, params]) => {
      this.state = state;
      this.denied = params.get('denied');
      this.groups = state.status === 'ready' ? groupsFor(state.access) : [];
    });
  }

  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  get loading(): boolean {
    return this.state.status === 'loading' || this.state.status === 'idle';
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
