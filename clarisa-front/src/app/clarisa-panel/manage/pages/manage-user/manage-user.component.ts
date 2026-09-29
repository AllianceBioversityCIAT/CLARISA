import { Component, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subject, Subscription, forkJoin, of } from 'rxjs';
import { catchError, debounceTime } from 'rxjs/operators';

import {
  AccessAdminApiService,
  AccessRole,
  AccessUser,
  ACCESS_LIMITS,
  MeAccess,
  PermissionGroup,
  RoleRef,
  countOf
} from '../../../../shared/services/access-admin/access-admin-api.service';
import { accessErrorMessage, assignableRoles, fullName } from '../../../../shared/services/access-admin/access-rules';
import { PanelAccessService } from '../../../../shared/services/access-admin/panel-access.service';
import { ACCESS_INFO } from '../../components/access/access-field-info';

interface SkeletonRow {
  skeleton: true;
  id: number;
}

type Row = AccessUser | SkeletonRow;

/**
 * Users of CLARISA and the roles they hold (Héctor, 2026-09-29: «terminar la
 * sección de users para que yo pueda asignar tantos usuarios quiera a ese
 * Rol»). The list is paged by the server: there are thousands of people.
 *
 * Every write locks on the first click (a flag set before the request leaves)
 * and unlocks on the answer, so two taps never send two requests.
 */
@Component({
  selector: 'app-manage-user',
  templateUrl: './manage-user.component.html',
  styleUrls: ['./manage-user.component.scss'],
  providers: [MessageService]
})
export class ManageUserComponent implements OnInit, OnDestroy {
  readonly info = ACCESS_INFO;
  readonly skeleton: SkeletonRow[] = Array.from({ length: 8 }, (_, i) => ({ skeleton: true, id: -1 - i }));
  readonly pageSizes = [20, 50, 100];
  readonly fullName = fullName;

  users: AccessUser[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  loading = true;
  loadError: string | null = null;

  search = '';
  roleId: number | null = null;
  withoutRole = false;

  roles: AccessRole[] = [];
  catalog: PermissionGroup[] = [];
  access: MeAccess | null = null;
  rolesError: string | null = null;

  selection: AccessUser[] = [];

  // bulk assign
  assignOpen = false;
  assignRoleId: number | null = null;
  assigning = false;
  assignError: string | null = null;

  // drawer
  drawerUser: AccessUser | null = null;
  drawerOpen = false;
  addRoleId: number | null = null;
  adding = false;
  drawerError: string | null = null;

  // remove
  removeTarget: { user: AccessUser; role: RoleRef } | null = null;
  removing = false;
  removeError: string | null = null;

  private readonly search$ = new Subject<void>();
  private readonly subs = new Subscription();
  private loadSub?: Subscription;

  constructor(
    private readonly _api: AccessAdminApiService,
    private readonly _access: PanelAccessService,
    private readonly _toast: MessageService
  ) {}

  ngOnInit(): void {
    this.subs.add(this.search$.pipe(debounceTime(300)).subscribe(() => this.reload()));
    this.subs.add(this._access.resolved().subscribe(access => (this.access = access)));
    this.loadRoles();
    this.load();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.loadSub?.unsubscribe();
  }

  // ---- list -----------------------------------------------------------------

  get rows(): Row[] {
    return this.loading ? this.skeleton : this.users;
  }

  get first(): number {
    return (this.page - 1) * this.pageSize;
  }

  get hasFilters(): boolean {
    return !!this.search.trim() || !!this.roleId || this.withoutRole;
  }

  get roleOptions(): { label: string; value: number }[] {
    return this.roles.map(role => ({ label: `${role.description} (${role.acronym})`, value: role.id }));
  }

  isSkeleton(row: Row): row is SkeletonRow {
    return (row as SkeletonRow).skeleton === true;
  }

  load(): void {
    this.loadSub?.unsubscribe();
    this.loading = true;
    this.loadError = null;
    this.loadSub = this._api
      .users({ search: this.search, roleId: this.roleId, withoutRole: this.withoutRole, page: this.page, pageSize: this.pageSize })
      .subscribe({
        next: result => {
          this.users = result.items ?? [];
          this.total = result.total ?? this.users.length;
          this.loading = false;
          // A selection only makes sense over what is on screen.
          const onScreen = new Set(this.users.map(user => user.id));
          this.selection = this.selection.filter(user => onScreen.has(user.id));
        },
        error: error => {
          this.users = [];
          this.total = 0;
          this.loading = false;
          this.loadError = accessErrorMessage(error, 'load the users');
        }
      });
  }

  /** Filters changed: back to page 1. */
  reload(): void {
    this.page = 1;
    this.load();
  }

  onSearch(): void {
    this.search$.next();
  }

  onWithoutRole(): void {
    if (this.withoutRole) this.roleId = null;
    this.reload();
  }

  clearFilters(): void {
    this.search = '';
    this.roleId = null;
    this.withoutRole = false;
    this.reload();
  }

  onPage(event: { first: number; rows: number }): void {
    const size = event.rows || this.pageSize;
    const page = Math.floor((event.first || 0) / size) + 1;
    if (page === this.page && size === this.pageSize) return;
    this.pageSize = size;
    this.page = page;
    this.load();
  }

  loadRoles(): void {
    this.rolesError = null;
    forkJoin({
      roles: this._api.roles(),
      catalog: this._api.permissions().pipe(catchError(() => of([] as PermissionGroup[])))
    }).subscribe({
      next: ({ roles, catalog }) => {
        this.roles = roles ?? [];
        this.catalog = catalog ?? [];
      },
      error: error => (this.rolesError = accessErrorMessage(error, 'load the roles'))
    });
  }

  /** Roles the caller may give (design.md § Levels and rules, mirrored). */
  get assignable(): AccessRole[] {
    return assignableRoles(this.roles, this.access, this.catalog);
  }

  canRemove(role: RoleRef): boolean {
    return this.assignable.some(candidate => candidate.id === role.id);
  }

  // ---- bulk assign ------------------------------------------------------------

  openAssign(): void {
    if (!this.selection.length) return;
    this.assignRoleId = null;
    this.assignError = null;
    this.assignOpen = true;
  }

  get assignRole(): AccessRole | undefined {
    return this.roles.find(role => role.id === this.assignRoleId);
  }

  assign(): void {
    const role = this.assignRole;
    if (this.assigning || !role || !this.selection.length) return;
    const ids = this.selection.map(user => user.id).slice(0, ACCESS_LIMITS.bulkMax);
    this.assigning = true;
    this.assignError = null;
    this._api.addMembers(role.id, ids).subscribe({
      next: result => {
        this.assigning = false;
        this.assignOpen = false;
        this.selection = [];
        const added = countOf(result?.added);
        const already = countOf(result?.alreadyMembers);
        this._toast.add({
          severity: 'success',
          summary: `${role.acronym} assigned`,
          detail: `${added} ${added === 1 ? 'person' : 'people'} got the role${already ? `; ${already} already had it` : ''}.`
        });
        this.load();
        this.loadRoles();
      },
      error: error => {
        this.assigning = false;
        this.assignError = accessErrorMessage(error, 'assign the role');
      }
    });
  }

  // ---- drawer -------------------------------------------------------------------

  openUser(user: AccessUser): void {
    this.drawerUser = user;
    this.addRoleId = null;
    this.drawerError = null;
    this.drawerOpen = true;
  }

  /** Roles the caller may give that this person does not hold yet. */
  get addableRoles(): { label: string; value: number }[] {
    const held = new Set((this.drawerUser?.roles ?? []).map(role => role.id));
    return this.assignable.filter(role => !held.has(role.id)).map(role => ({ label: `${role.description} (${role.acronym})`, value: role.id }));
  }

  addRole(): void {
    const user = this.drawerUser;
    const role = this.roles.find(candidate => candidate.id === this.addRoleId);
    if (this.adding || !user || !role) return;
    this.adding = true;
    this.drawerError = null;
    this._api.addMembers(role.id, [user.id]).subscribe({
      next: () => {
        this.adding = false;
        this.addRoleId = null;
        this.patchUser(user.id, roles => [...roles.filter(held => held.id !== role.id), { id: role.id, acronym: role.acronym, description: role.description }]);
        this._toast.add({ severity: 'success', summary: 'Role added', detail: `${fullName(user)} now holds ${role.acronym}.` });
        this.loadRoles();
      },
      error: error => {
        this.adding = false;
        this.drawerError = accessErrorMessage(error, 'add the role');
      }
    });
  }

  askRemove(user: AccessUser, role: RoleRef): void {
    this.removeError = null;
    this.removeTarget = { user, role };
  }

  get removeMessage(): string {
    const target = this.removeTarget;
    return target ? `${fullName(target.user)} will lose ${target.role.acronym} and what it opens. The change is logged with your name.` : '';
  }

  removeRole(justification: string): void {
    const target = this.removeTarget;
    if (this.removing || !target) return;
    this.removing = true;
    this.removeError = null;
    this._api.removeMember(target.role.id, target.user.id, justification).subscribe({
      next: () => {
        this.removing = false;
        this.removeTarget = null;
        this.patchUser(target.user.id, roles => roles.filter(role => role.id !== target.role.id));
        this._toast.add({ severity: 'success', summary: 'Role removed', detail: `${fullName(target.user)} no longer holds ${target.role.acronym}.` });
        this.loadRoles();
      },
      error: error => {
        this.removing = false;
        this.removeError = accessErrorMessage(error, 'remove the role');
      }
    });
  }

  closeRemove(): void {
    if (!this.removing) this.removeTarget = null;
  }

  /** Updates one person in the table and in the drawer without a reload. */
  private patchUser(id: number, change: (roles: RoleRef[]) => RoleRef[]): void {
    const apply = (user: AccessUser): AccessUser => (user.id === id ? { ...user, roles: change(user.roles ?? []) } : user);
    this.users = this.users.map(apply);
    if (this.drawerUser?.id === id) this.drawerUser = apply(this.drawerUser);
  }
}
