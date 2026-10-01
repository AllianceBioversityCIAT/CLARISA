import { Component, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';

import { AccessAdminApiService, AccessRole, MeAccess, PermissionGroup } from '../../../../shared/services/access-admin/access-admin-api.service';
import { accessErrorMessage, levelLabel } from '../../../../shared/services/access-admin/access-rules';
import { PanelAccessService } from '../../../../shared/services/access-admin/panel-access.service';

/** A role plus the text its Level column sorts by. */
export interface RoleRow extends AccessRole {
  levelText: string;
}

/**
 * Roles of CLARISA: what each one opens and who holds it (Héctor, 2026-09-29:
 * «un sistema de roles que yo pueda crear un rol que se llama MELIAF Data
 * Admins»). The list is short (a few dozen at most), so it is loaded whole and
 * sorted in the browser.
 */
@Component({
  selector: 'app-manage-role',
  templateUrl: './manage-role.component.html',
  styleUrls: ['./manage-role.component.scss'],
  providers: [MessageService]
})
export class ManageRoleComponent implements OnInit, OnDestroy {
  readonly levelLabel = levelLabel;
  readonly skeleton = Array.from({ length: 6 }, (_, i) => ({ skeleton: true, id: -1 - i }));

  roles: RoleRow[] = [];
  catalog: PermissionGroup[] = [];
  access: MeAccess | null = null;
  loading = true;
  loadError: string | null = null;

  dialogOpen = false;
  editing: AccessRole | null = null;

  private readonly subs = new Subscription();

  constructor(
    private readonly _api: AccessAdminApiService,
    private readonly _access: PanelAccessService
  ) {}

  ngOnInit(): void {
    this.subs.add(this._access.resolved().subscribe(access => (this.access = access)));
    this.load();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get rows(): unknown[] {
    return this.loading ? this.skeleton : this.roles;
  }

  isSkeleton(row: unknown): boolean {
    return (row as { skeleton?: boolean })?.skeleton === true;
  }

  load(): void {
    this.loading = true;
    this.loadError = null;
    this.subs.add(
      forkJoin({ roles: this._api.roles(), catalog: this._api.permissions() }).subscribe({
        next: ({ roles, catalog }) => {
          this.roles = (roles ?? []).map(role => ({ ...role, levelText: levelLabel(role.level) }));
          this.catalog = catalog ?? [];
          this.loading = false;
        },
        error: error => {
          this.roles = [];
          this.loading = false;
          this.loadError = accessErrorMessage(error, 'load the roles');
        }
      })
    );
  }

  openNew(): void {
    this.editing = null;
    this.dialogOpen = true;
  }

  open(role: AccessRole): void {
    this.editing = role;
    this.dialogOpen = true;
  }

  onSaved(): void {
    this.load();
  }
}
