import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Observable, concat, of } from 'rxjs';
import { last } from 'rxjs/operators';

import {
  AccessAdminApiService,
  AccessPermission,
  AccessRole,
  ACCESS_LIMITS,
  MeAccess,
  PermissionGroup
} from '../../../../../../shared/services/access-admin/access-admin-api.service';
import { accessErrorMessage, assignableRoles, holdsPermission, levelLabel } from '../../../../../../shared/services/access-admin/access-rules';
import { ACCESS_INFO } from '../../../../components/access/access-field-info';

type Tab = 'role' | 'members';

/**
 * Create or edit one role: its name, the permissions it bundles (grouped by
 * module, in plain words) and, once it exists, its members.
 *
 * Opens read-only for a system role (SA, MS, CRON_EXEC, RQAT, OU: CLARISA
 * itself depends on them) and for a role the caller could not have created —
 * one holding a permission they lack, or a Super admin role — since the back
 * would refuse the save anyway.
 */
@Component({
  selector: 'app-role-dialog',
  templateUrl: './role-dialog.component.html'
})
export class RoleDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  /** `null` = new role. */
  @Input() role: AccessRole | null = null;
  @Input() catalog: PermissionGroup[] = [];
  @Input() access: MeAccess | null = null;
  /** Every role, to warn about a repeated acronym before sending. */
  @Input() roles: AccessRole[] = [];
  @Output() saved = new EventEmitter<void>();

  readonly info = ACCESS_INFO;
  readonly limits = ACCESS_LIMITS;
  readonly levelLabel = levelLabel;

  tab: Tab = 'role';
  acronym = '';
  description = '';
  selected = new Set<number>();
  saving = false;
  error: string | null = null;

  private initial = { acronym: '', description: '', ids: '' };

  constructor(
    private readonly _api: AccessAdminApiService,
    private readonly _toast: MessageService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['visible'] && this.visible) || (changes['role'] && this.visible)) this.reset();
  }

  private reset(): void {
    this.tab = 'role';
    this.acronym = this.role?.acronym ?? '';
    this.description = this.role?.description ?? '';
    this.selected = new Set(this.role?.permissionIds ?? []);
    this.saving = false;
    this.error = null;
    this.initial = { acronym: this.acronym, description: this.description, ids: this.key(this.selected) };
  }

  // ---- state ------------------------------------------------------------------

  get isNew(): boolean {
    return !this.role;
  }

  get isSystem(): boolean {
    return !!this.role?.isSystem;
  }

  /** Why the role opens read-only, or `null` when it can be edited. */
  get lockedReason(): string | null {
    if (!this.role) return null;
    if (this.role.isSystem) return 'System role: CLARISA itself depends on it, so it cannot be changed here.';
    const mine = assignableRoles([this.role], this.access, this.catalog);
    if (!mine.length) return 'This role holds permissions you do not have, so you can see it but not change it.';
    return null;
  }

  get readOnly(): boolean {
    return !!this.lockedReason;
  }

  get title(): string {
    return this.role ? `${this.role.acronym} · ${this.role.description}` : 'New role';
  }

  get acronymError(): string | null {
    const value = this.acronym.trim();
    if (!value) return null;
    if (!ACCESS_LIMITS.acronymPattern.test(value)) return 'Use 2 to 50 letters, digits, “_” or “-”, without spaces.';
    const taken = this.roles.some(role => role.id !== this.role?.id && role.acronym.toUpperCase() === value.toUpperCase());
    return taken ? 'Another role already uses this acronym.' : null;
  }

  get descriptionError(): string | null {
    const length = this.description.trim().length;
    if (!length) return null;
    return length < ACCESS_LIMITS.descriptionMin ? `At least ${ACCESS_LIMITS.descriptionMin} characters.` : null;
  }

  get valid(): boolean {
    return !!this.acronym.trim() && !!this.description.trim() && !this.acronymError && !this.descriptionError;
  }

  get dirty(): boolean {
    return (
      this.acronym.trim() !== this.initial.acronym ||
      this.description.trim() !== this.initial.description ||
      this.key(this.selected) !== this.initial.ids
    );
  }

  get canSave(): boolean {
    return !this.readOnly && !this.saving && this.valid && (this.isNew || this.dirty);
  }

  // ---- permissions ----------------------------------------------------------

  canGrant(permission: AccessPermission): boolean {
    return !this.readOnly && holdsPermission(permission.name, this.access);
  }

  isChecked(permission: AccessPermission): boolean {
    return this.selected.has(permission.id);
  }

  toggle(permission: AccessPermission, checked: boolean): void {
    if (!this.canGrant(permission)) return;
    const next = new Set(this.selected);
    if (checked) next.add(permission.id);
    else next.delete(permission.id);
    this.selected = next;
  }

  countIn(group: PermissionGroup): number {
    return group.items.filter(item => this.selected.has(item.id)).length;
  }

  /** Ticks (or clears) every permission of the group the caller can grant. */
  toggleGroup(group: PermissionGroup): void {
    if (this.readOnly) return;
    const grantable = group.items.filter(item => this.canGrant(item));
    const allOn = grantable.every(item => this.selected.has(item.id));
    const next = new Set(this.selected);
    grantable.forEach(item => (allOn ? next.delete(item.id) : next.add(item.id)));
    this.selected = next;
  }

  groupAllOn(group: PermissionGroup): boolean {
    const grantable = group.items.filter(item => this.canGrant(item));
    return grantable.length > 0 && grantable.every(item => this.selected.has(item.id));
  }

  hasGrantable(group: PermissionGroup): boolean {
    return group.items.some(item => this.canGrant(item));
  }

  // ---- save -------------------------------------------------------------------

  save(): void {
    if (!this.canSave) return;
    this.saving = true;
    this.error = null;

    const acronym = this.acronym.trim().toUpperCase();
    const description = this.description.trim();
    const permissionIds = [...this.selected].sort((a, b) => a - b);

    let request: Observable<unknown>;
    if (!this.role) {
      request = this._api.createRole({ acronym, description, permissionIds });
    } else {
      const steps: Observable<unknown>[] = [];
      const changes: { acronym?: string; description?: string } = {};
      if (acronym !== this.initial.acronym.toUpperCase()) changes.acronym = acronym;
      if (description !== this.initial.description) changes.description = description;
      if (Object.keys(changes).length) steps.push(this._api.updateRole(this.role.id, changes));
      if (this.key(this.selected) !== this.initial.ids) steps.push(this._api.setRolePermissions(this.role.id, permissionIds));
      request = steps.length ? concat(...steps).pipe(last()) : of(null);
    }

    request.subscribe({
      next: () => {
        this.saving = false;
        this._toast.add({
          severity: 'success',
          summary: this.role ? 'Role saved' : 'Role created',
          detail: this.role ? `${acronym} was updated.` : `${acronym} exists now. Add its members from the Members tab.`
        });
        this.saved.emit();
        this.close();
      },
      error: error => {
        this.saving = false;
        this.error = accessErrorMessage(error, this.role ? 'save the role' : 'create the role');
      }
    });
  }

  selectTab(tab: Tab): void {
    if (tab === 'members' && this.isNew) return;
    this.tab = tab;
  }

  close(): void {
    if (this.saving) return;
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onMembersChanged(): void {
    this.saved.emit();
  }

  private key(ids: Set<number>): string {
    return [...ids].sort((a, b) => a - b).join(',');
  }
}
