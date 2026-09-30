import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserData } from '../../shared/interfaces/user-data';
import {
  RoleLevel,
  UserAccess,
  UserAccessService,
} from '../user/user-access.service';
import {
  AccessAdminRepository,
  PermissionRow,
  Queryable,
  RoleRow,
} from './access-admin.repository';
import {
  ACCESS_ADMIN_DEFAULT_PAGE_SIZE,
  AccessAdminRoleDto,
  AccessAdminUserDto,
  AddMembersResultDto,
  AddRoleMembersDto,
  CreateRoleDto,
  ListMembersQueryDto,
  ListUsersQueryDto,
  PageDto,
  PermissionGroupDto,
  RemoveMemberResultDto,
  RemoveRoleMemberDto,
  SetRolePermissionsDto,
  UpdateRoleDto,
} from './dto/access-admin.dto';

/** Module shown for a permission nobody described yet. */
export const OTHER_MODULE = 'Other';

export const ACCESS_ADMIN_ERRORS = {
  onlySuperGrantsSuper:
    'Only a super administrator can grant or remove the SuperAdmin role.',
  notSubset: 'You can only give roles and permissions that you hold yourself.',
  systemRole: 'System roles cannot be edited from this screen.',
  onlySuperEditsNonModule: 'Only a super administrator can edit this role.',
  lastSuper: 'The last active SuperAdmin cannot be removed.',
  inactiveRole: 'This role is inactive. Activate it before adding people.',
  duplicateAcronym: 'A role with this acronym already exists.',
} as const;

/**
 * Roles and users administration (design: openspec add-roles-users-admin).
 *
 * Every rule lives here, server-side; the panel only mirrors them:
 * 1. only a `super` caller can grant/remove a `super` role (SA);
 * 2. anyone else can only give what they hold: a role's permissions (or the
 *    permissions put on a role) must be a subset of the caller's own;
 * 3. the last active SuperAdmin cannot be removed;
 * 4. system roles are not editable; non-super callers edit `module` roles only;
 * 5. assignment is idempotent (re-grant reactivates the same row);
 * 6. removal deactivates the row, with a required justification;
 * 7. roles are never deleted, only deactivated.
 */
@Injectable()
export class AccessAdminService {
  constructor(
    private readonly _repository: AccessAdminRepository,
    private readonly _userAccessService: UserAccessService,
  ) {}

  // ---------- reads ----------

  async listUsers(
    query: ListUsersQueryDto,
  ): Promise<PageDto<AccessAdminUserDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? ACCESS_ADMIN_DEFAULT_PAGE_SIZE;
    const { rows, total } = await this._repository.listUsers({
      search: query.search || undefined,
      roleId: query.roleId,
      withoutRole: query.withoutRole === true,
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });
    const roles = await this._repository.rolesOfUsers(rows.map((r) => r.id));
    return {
      items: rows.map((u) => ({ ...u, roles: roles.get(u.id) ?? [] })),
      total,
      page,
      pageSize,
    };
  }

  async listMembers(
    roleId: number,
    query: ListMembersQueryDto,
  ): Promise<PageDto<AccessAdminUserDto>> {
    await this.requireRole(this._repository.db, roleId);
    return this.listUsers({ ...query, roleId });
  }

  async listRoles(): Promise<AccessAdminRoleDto[]> {
    return this._repository.listRoles();
  }

  async listPermissions(): Promise<PermissionGroupDto[]> {
    const groups = new Map<string, PermissionGroupDto>();
    for (const p of await this._repository.listPermissions()) {
      const module = p.module || OTHER_MODULE;
      const group = groups.get(module) ?? { module, items: [] };
      group.items.push({
        id: p.id,
        name: p.name,
        label: p.label || p.name,
        description: p.description,
      });
      groups.set(module, group);
    }
    // "Other" last: it holds what nobody has described yet.
    return [...groups.values()].sort((a, b) =>
      a.module === OTHER_MODULE
        ? 1
        : b.module === OTHER_MODULE
          ? -1
          : a.module.localeCompare(b.module),
    );
  }

  // ---------- roles ----------

  async createRole(
    dto: CreateRoleDto,
    userData: UserData,
  ): Promise<AccessAdminRoleDto> {
    const caller = await this.caller(userData);
    const acronym = dto.acronym.toUpperCase();

    const roleId = await this._repository.transaction(async (tx) => {
      // 🛑 The locking read MUST be the first statement of the transaction.
      // InnoDB (REPEATABLE READ) fixes the snapshot at the first plain read;
      // if that happened before waiting on this lock, a parallel double
      // submit would not see the first one's grants and answer 409 instead
      // of the role it just created (measured on MySQL 8.4, 2026-09-29).
      const existing = await this._repository.findRolesByAcronym(
        tx,
        acronym,
        true,
      );
      const permissions = await this.grantablePermissions(
        tx,
        caller,
        dto.permissionIds,
      );
      if (existing.length) {
        // A repeated submit of the same form returns the role it created;
        // anything else with that acronym is a real clash.
        const same = existing.find(
          (r) => r.isActive && r.description === dto.description,
        );
        if (same && (await this.samePermissions(tx, same.id, permissions))) {
          return same.id;
        }
        throw new ConflictException(ACCESS_ADMIN_ERRORS.duplicateAcronym);
      }
      const id = await this._repository.insertRole(
        tx,
        acronym,
        dto.description,
        caller.userId,
      );
      for (const p of permissions) {
        await this._repository.insertGrant(tx, id, p.id, caller.userId);
      }
      return id;
    });

    return this.roleDto(roleId);
  }

  async updateRole(
    roleId: number,
    dto: UpdateRoleDto,
    userData: UserData,
  ): Promise<AccessAdminRoleDto> {
    const caller = await this.caller(userData);
    await this._repository.transaction(async (tx) => {
      const role = await this.requireRole(tx, roleId, true);
      this.assertEditable(caller, role);
      if (!caller.isSuper) {
        await this.assertSubset(
          caller,
          await this._repository.rolePermissions(tx, role.id),
        );
      }

      const acronym = dto.acronym?.toUpperCase();
      if (acronym && acronym !== role.acronym.toUpperCase()) {
        const clash = await this._repository.findRolesByAcronym(
          tx,
          acronym,
          true,
        );
        if (clash.some((r) => r.id !== role.id)) {
          throw new ConflictException(ACCESS_ADMIN_ERRORS.duplicateAcronym);
        }
      }

      await this._repository.updateRole(
        tx,
        role.id,
        {
          acronym,
          description: dto.description,
          isActive: dto.isActive,
        },
        caller.userId,
        dto.justification,
      );
    });
    return this.roleDto(roleId);
  }

  /** Replaces the role's permissions; rows are (re)activated, never deleted. */
  async setRolePermissions(
    roleId: number,
    dto: SetRolePermissionsDto,
    userData: UserData,
  ): Promise<AccessAdminRoleDto> {
    const caller = await this.caller(userData);
    await this._repository.transaction(async (tx) => {
      const role = await this.requireRole(tx, roleId, true);
      this.assertEditable(caller, role);
      if (!caller.isSuper) {
        // What the role opens today must be the caller's to take away too.
        await this.assertSubset(
          caller,
          await this._repository.rolePermissions(tx, role.id),
        );
      }
      const wanted = await this.grantablePermissions(
        tx,
        caller,
        dto.permissionIds,
      );
      const wantedIds = new Set(wanted.map((p) => p.id));

      const grants = await this._repository.grants(tx, role.id);
      const toDeactivate = grants
        .filter((g) => g.isActive && !wantedIds.has(g.permissionId))
        .map((g) => g.id);
      const toReactivate: number[] = [];
      const toInsert: number[] = [];
      for (const permissionId of wantedIds) {
        const rows = grants.filter((g) => g.permissionId === permissionId);
        if (rows.some((g) => g.isActive)) continue;
        if (rows.length) toReactivate.push(rows[0].id);
        else toInsert.push(permissionId);
      }

      await this._repository.setGrantsActive(
        tx,
        toDeactivate,
        false,
        caller.userId,
      );
      await this._repository.setGrantsActive(
        tx,
        toReactivate,
        true,
        caller.userId,
      );
      for (const permissionId of toInsert) {
        await this._repository.insertGrant(
          tx,
          role.id,
          permissionId,
          caller.userId,
        );
      }
    });
    return this.roleDto(roleId);
  }

  // ---------- members ----------

  async addMembers(
    roleId: number,
    dto: AddRoleMembersDto,
    userData: UserData,
  ): Promise<AddMembersResultDto> {
    const caller = await this.caller(userData);
    const userIds = [...new Set(dto.userIds)];

    return this._repository.transaction(async (tx) => {
      // Row lock on the role: two submits of the same assignment run one
      // after the other, so the second one sees the first one's rows.
      const role = await this.requireRole(tx, roleId, true);
      if (!role.isActive) {
        throw new ConflictException(ACCESS_ADMIN_ERRORS.inactiveRole);
      }
      await this.assertCanGrant(tx, caller, role);

      const found = new Set(
        await this._repository.existingUserIds(tx, userIds),
      );
      const missing = userIds.filter((id) => !found.has(id));
      if (missing.length) {
        throw new BadRequestException(
          `Unknown user id(s): ${missing.join(', ')}`,
        );
      }

      const rows = await this._repository.memberships(tx, role.id, userIds);
      const result: AddMembersResultDto = { added: [], alreadyMembers: [] };
      for (const userId of userIds) {
        const mine = rows.filter((r) => r.userId === userId);
        if (mine.some((r) => r.isActive)) {
          result.alreadyMembers.push(userId);
        } else if (mine.length) {
          await this._repository.reactivateMembership(
            tx,
            mine[0].id,
            caller.userId,
          );
          result.added.push(userId);
        } else {
          await this._repository.insertMembership(
            tx,
            userId,
            role.id,
            caller.userId,
          );
          result.added.push(userId);
        }
      }
      return result;
    });
  }

  async removeMember(
    roleId: number,
    userId: number,
    dto: RemoveRoleMemberDto,
    userData: UserData,
  ): Promise<RemoveMemberResultDto> {
    const caller = await this.caller(userData);

    return this._repository.transaction(async (tx) => {
      const role = await this.requireRole(tx, roleId, true);
      await this.assertCanGrant(tx, caller, role);

      const active = (
        await this._repository.memberships(tx, role.id, [userId])
      ).filter((r) => r.isActive);
      if (!active.length) {
        // Already removed (a repeated call): nothing to write.
        return { removed: false };
      }

      if (role.level === RoleLevel.SUPER) {
        const others = await this._repository.countOtherActiveSupers(
          tx,
          userId,
        );
        if (others === 0) {
          throw new ConflictException(ACCESS_ADMIN_ERRORS.lastSuper);
        }
      }

      await this._repository.deactivateMemberships(
        tx,
        active.map((r) => r.id),
        caller.userId,
        dto.justification,
      );
      return { removed: true };
    });
  }

  // ---------- rules ----------

  private caller(userData: UserData): Promise<UserAccess> {
    return this._userAccessService.getAccess(userData?.email);
  }

  private async requireRole(
    q: Queryable,
    roleId: number,
    lock = false,
  ): Promise<RoleRow> {
    const role = await this._repository.findRole(q, roleId, lock);
    if (!role) {
      throw new NotFoundException(`Role ${roleId} was not found`);
    }
    return role;
  }

  /** Rules 1 and 2 for giving or taking a role from someone. */
  private async assertCanGrant(
    q: Queryable,
    caller: UserAccess,
    role: RoleRow,
  ): Promise<void> {
    if (caller.isSuper) return;
    if (role.level === RoleLevel.SUPER) {
      throw new ForbiddenException(ACCESS_ADMIN_ERRORS.onlySuperGrantsSuper);
    }
    await this.assertSubset(
      caller,
      await this._repository.rolePermissions(q, role.id),
    );
  }

  /** Rule 4. */
  private assertEditable(caller: UserAccess, role: RoleRow): void {
    if (role.isSystem) {
      throw new ForbiddenException(ACCESS_ADMIN_ERRORS.systemRole);
    }
    if (!caller.isSuper && role.level !== RoleLevel.MODULE) {
      throw new ForbiddenException(ACCESS_ADMIN_ERRORS.onlySuperEditsNonModule);
    }
  }

  /**
   * Rule 2. Exact name match against the caller's effective permissions (the
   * same list `PermissionGuard` uses). Stricter than the guard's substring
   * match on purpose: holding `/api/institutions` does not let anyone hand out
   * a permission row they do not hold by name.
   */
  private async assertSubset(
    caller: UserAccess,
    permissions: PermissionRow[],
  ): Promise<void> {
    const own = new Set(caller.permissions);
    if (permissions.some((p) => !own.has(p.name))) {
      throw new ForbiddenException(ACCESS_ADMIN_ERRORS.notSubset);
    }
  }

  /** Requested ids must exist, be active and (non-super) be the caller's. */
  private async grantablePermissions(
    q: Queryable,
    caller: UserAccess,
    ids: number[],
  ): Promise<PermissionRow[]> {
    const unique = [...new Set(ids ?? [])];
    const found = await this._repository.permissionsByIds(q, unique);
    const usable = new Map(
      found.filter((p) => p.isActive).map((p) => [p.id, p]),
    );
    const invalid = unique.filter((id) => !usable.has(id));
    if (invalid.length) {
      throw new BadRequestException(
        `Unknown or inactive permission id(s): ${invalid.join(', ')}`,
      );
    }
    const permissions = unique.map((id) => usable.get(id));
    if (!caller.isSuper) {
      await this.assertSubset(caller, permissions);
    }
    return permissions;
  }

  private async samePermissions(
    q: Queryable,
    roleId: number,
    permissions: PermissionRow[],
  ): Promise<boolean> {
    const current = (await this._repository.rolePermissions(q, roleId))
      .map((p) => p.id)
      .sort((a, b) => a - b);
    const wanted = permissions.map((p) => p.id).sort((a, b) => a - b);
    return (
      current.length === wanted.length &&
      current.every((id, i) => id === wanted[i])
    );
  }

  private async roleDto(roleId: number): Promise<AccessAdminRoleDto> {
    const role = (await this._repository.listRoles()).find(
      (r) => r.id === roleId,
    );
    if (!role) {
      throw new NotFoundException(`Role ${roleId} was not found`);
    }
    return role;
  }
}
