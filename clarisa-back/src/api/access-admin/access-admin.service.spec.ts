import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserData } from '../../shared/interfaces/user-data';
import { UserAccess, UserAccessService } from '../user/user-access.service';
import {
  AccessAdminRepository,
  Queryable,
  UserFilter,
} from './access-admin.repository';
import {
  ACCESS_ADMIN_ERRORS,
  AccessAdminService,
  OTHER_MODULE,
} from './access-admin.service';

/**
 * In-memory copy of the five auth tables. The fake repository answers with
 * the same semantics as the SQL one (active filters, row shapes), so every
 * rule is exercised against data, not against a mocked return value.
 */
interface Tables {
  users: Array<{ id: number; email: string; is_active: boolean }>;
  roles: Array<{
    id: number;
    acronym: string;
    description: string;
    is_active: boolean;
    is_system: boolean;
    level: string;
  }>;
  permissions: Array<{
    id: number;
    name: string;
    is_active: boolean;
    module?: string | null;
    label?: string | null;
    description?: string | null;
  }>;
  role_permission: Array<{
    id: number;
    role_id: number;
    permission_id: number;
    is_active: boolean;
    updated_by?: number;
  }>;
  user_roles: Array<{
    id: number;
    user_id: number;
    role_id: number;
    is_active: boolean;
    created_by?: number;
    updated_by?: number;
    modification_justification?: string | null;
  }>;
}

const SA = 1;
const UM = 2;
const MS = 3;
const CONCEPTS = 10;
const GLOSS = 11;

const P_ACCESS = 1;
const P_CONCEPTS = 2;
const P_GLOSS = 3;
const P_BULK = 4;
const P_OLD = 5;

const SUPER_USER = 100;
const UM_USER = 200;

const seed = (): Tables => ({
  users: [
    { id: SUPER_USER, email: 'super@local.test', is_active: true },
    { id: 101, email: 'super2@local.test', is_active: true },
    { id: UM_USER, email: 'um@local.test', is_active: true },
    { id: 300, email: 'a@local.test', is_active: true },
    { id: 301, email: 'b@local.test', is_active: true },
    { id: 302, email: 'c@local.test', is_active: true },
  ],
  roles: [
    {
      id: SA,
      acronym: 'SA',
      description: 'SuperAdmin',
      is_active: true,
      is_system: true,
      level: 'super',
    },
    {
      id: UM,
      acronym: 'UM',
      description: 'User Manager',
      is_active: true,
      is_system: false,
      level: 'user_admin',
    },
    {
      id: MS,
      acronym: 'MS',
      description: 'Microservice',
      is_active: true,
      is_system: true,
      level: 'module',
    },
    {
      id: CONCEPTS,
      acronym: 'CONCEPTS_DA',
      description: 'Concepts Data Admins',
      is_active: true,
      is_system: false,
      level: 'module',
    },
    {
      id: GLOSS,
      acronym: 'GLOSS',
      description: 'Glossary editors',
      is_active: true,
      is_system: false,
      level: 'module',
    },
  ],
  permissions: [
    {
      id: P_ACCESS,
      name: '/api/access-admin',
      is_active: true,
      module: 'Access',
      label: 'Manage roles and users',
    },
    {
      id: P_CONCEPTS,
      name: '/api/concepts/admin',
      is_active: true,
      module: 'Concepts',
      label: 'Manage Concepts',
    },
    {
      id: P_GLOSS,
      name: '/api/glossary/admin',
      is_active: true,
      module: 'Glossary',
      label: 'Manage the glossary',
    },
    {
      id: P_BULK,
      name: '/api/institutions/create-bulk',
      is_active: true,
      module: null,
      label: null,
    },
    { id: P_OLD, name: '/api/old', is_active: false },
  ],
  role_permission: [
    { id: 1, role_id: SA, permission_id: P_ACCESS, is_active: true },
    { id: 2, role_id: SA, permission_id: P_CONCEPTS, is_active: true },
    { id: 3, role_id: SA, permission_id: P_GLOSS, is_active: true },
    { id: 4, role_id: SA, permission_id: P_BULK, is_active: true },
    { id: 5, role_id: UM, permission_id: P_ACCESS, is_active: true },
    { id: 6, role_id: UM, permission_id: P_GLOSS, is_active: true },
    { id: 7, role_id: CONCEPTS, permission_id: P_CONCEPTS, is_active: true },
    { id: 8, role_id: GLOSS, permission_id: P_GLOSS, is_active: true },
  ],
  user_roles: [
    { id: 1, user_id: SUPER_USER, role_id: SA, is_active: true },
    { id: 2, user_id: UM_USER, role_id: UM, is_active: true },
  ],
});

class FakeRepository {
  constructor(public t: Tables) {}
  readonly db: Queryable = { query: jest.fn() };
  readonly tx: Queryable = { query: jest.fn() };
  locks: number[] = [];
  transaction = jest.fn(<T>(work: (tx: Queryable) => Promise<T>) =>
    work(this.tx),
  );

  private next(rows: Array<{ id: number }>) {
    return Math.max(0, ...rows.map((r) => r.id)) + 1;
  }
  private role(r: Tables['roles'][number]) {
    return {
      id: r.id,
      acronym: r.acronym,
      description: r.description,
      isActive: r.is_active,
      isSystem: r.is_system,
      level: r.level,
    };
  }

  async listUsers(filter: UserFilter) {
    let rows = this.t.users;
    if (filter.roleId) {
      rows = rows.filter((u) =>
        this.t.user_roles.some(
          (ur) =>
            ur.user_id === u.id && ur.role_id === filter.roleId && ur.is_active,
        ),
      );
    }
    if (filter.withoutRole) {
      rows = rows.filter(
        (u) =>
          !this.t.user_roles.some((ur) => ur.user_id === u.id && ur.is_active),
      );
    }
    return {
      total: rows.length,
      rows: rows
        .slice(filter.offset, filter.offset + filter.limit)
        .map((u) => ({
          id: u.id,
          firstName: null,
          lastName: null,
          email: u.email,
          isCgiarUser: false,
          lastLogin: null,
          isActive: u.is_active,
        })),
    };
  }
  async rolesOfUsers(ids: number[]) {
    const map = new Map();
    for (const id of ids) {
      const chips = this.t.user_roles
        .filter((ur) => ur.user_id === id && ur.is_active)
        .map((ur) => this.t.roles.find((r) => r.id === ur.role_id))
        .filter((r) => r?.is_active)
        .map((r) => ({
          id: r.id,
          acronym: r.acronym,
          description: r.description,
        }));
      if (chips.length) map.set(id, chips);
    }
    return map;
  }
  async listRoles() {
    return this.t.roles.map((r) => ({
      ...this.role(r),
      memberCount: new Set(
        this.t.user_roles
          .filter((ur) => ur.role_id === r.id && ur.is_active)
          .map((ur) => ur.user_id),
      ).size,
      permissionIds: this.t.role_permission
        .filter((g) => g.role_id === r.id && g.is_active)
        .map((g) => g.permission_id)
        .sort((a, b) => a - b),
    }));
  }
  async listPermissions() {
    return this.t.permissions
      .filter((p) => p.is_active)
      .map((p) => ({
        id: p.id,
        name: p.name,
        module: p.module ?? null,
        label: p.label ?? null,
        description: p.description ?? null,
      }));
  }
  async findRole(_q: Queryable, id: number, lock = false) {
    if (lock) this.locks.push(id);
    const r = this.t.roles.find((x) => x.id === id);
    return r ? this.role(r) : null;
  }
  calls: string[] = [];
  async findRolesByAcronym(_q: Queryable, acronym: string, lock = false) {
    this.calls.push(`findRolesByAcronym:${lock}`);
    return this.t.roles
      .filter((r) => r.acronym.toUpperCase() === acronym.toUpperCase())
      .map((r) => this.role(r));
  }
  async rolePermissions(_q: Queryable, roleId: number) {
    return this.t.role_permission
      .filter((g) => g.role_id === roleId && g.is_active)
      .map((g) => this.t.permissions.find((p) => p.id === g.permission_id))
      .filter((p) => p.is_active)
      .map((p) => ({ id: p.id, name: p.name, isActive: p.is_active }));
  }
  async permissionsByIds(_q: Queryable, ids: number[]) {
    this.calls.push('permissionsByIds');
    return this.t.permissions
      .filter((p) => ids.includes(p.id))
      .map((p) => ({ id: p.id, name: p.name, isActive: p.is_active }));
  }
  async existingUserIds(_q: Queryable, ids: number[]) {
    return this.t.users.filter((u) => ids.includes(u.id)).map((u) => u.id);
  }
  async memberships(_q: Queryable, roleId: number, userIds: number[]) {
    return this.t.user_roles
      .filter((ur) => ur.role_id === roleId && userIds.includes(ur.user_id))
      .sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.id - a.id)
      .map((ur) => ({ id: ur.id, userId: ur.user_id, isActive: ur.is_active }));
  }
  async countOtherActiveSupers(_q: Queryable, excludeUserId: number) {
    const supers = this.t.roles
      .filter((r) => r.level === 'super' && r.is_active)
      .map((r) => r.id);
    return new Set(
      this.t.user_roles
        .filter(
          (ur) =>
            ur.is_active &&
            supers.includes(ur.role_id) &&
            ur.user_id !== excludeUserId &&
            this.t.users.find((u) => u.id === ur.user_id)?.is_active,
        )
        .map((ur) => ur.user_id),
    ).size;
  }
  async grants(_q: Queryable, roleId: number) {
    return this.t.role_permission
      .filter((g) => g.role_id === roleId)
      .sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.id - a.id)
      .map((g) => ({
        id: g.id,
        permissionId: g.permission_id,
        isActive: g.is_active,
      }));
  }
  async insertMembership(
    _q: Queryable,
    userId: number,
    roleId: number,
    by: number,
  ) {
    this.t.user_roles.push({
      id: this.next(this.t.user_roles),
      user_id: userId,
      role_id: roleId,
      is_active: true,
      created_by: by,
    });
  }
  async reactivateMembership(_q: Queryable, id: number, by: number) {
    const row = this.t.user_roles.find((ur) => ur.id === id);
    row.is_active = true;
    row.updated_by = by;
  }
  async deactivateMemberships(
    _q: Queryable,
    ids: number[],
    by: number,
    justification: string,
  ) {
    for (const row of this.t.user_roles.filter((ur) => ids.includes(ur.id))) {
      row.is_active = false;
      row.updated_by = by;
      row.modification_justification = justification;
    }
  }
  async insertRole(_q: Queryable, acronym: string, description: string) {
    const id = this.next(this.t.roles);
    this.t.roles.push({
      id,
      acronym,
      description,
      is_active: true,
      is_system: false,
      level: 'module',
    });
    return id;
  }
  async updateRole(
    _q: Queryable,
    id: number,
    fields: { acronym?: string; description?: string; isActive?: boolean },
  ) {
    const r = this.t.roles.find((x) => x.id === id);
    if (fields.acronym !== undefined) r.acronym = fields.acronym;
    if (fields.description !== undefined) r.description = fields.description;
    if (fields.isActive !== undefined) r.is_active = fields.isActive;
  }
  async insertGrant(_q: Queryable, roleId: number, permissionId: number) {
    this.t.role_permission.push({
      id: this.next(this.t.role_permission),
      role_id: roleId,
      permission_id: permissionId,
      is_active: true,
    });
  }
  async setGrantsActive(
    _q: Queryable,
    ids: number[],
    active: boolean,
    by: number,
  ) {
    for (const g of this.t.role_permission.filter((x) => ids.includes(x.id))) {
      g.is_active = active;
      g.updated_by = by;
    }
  }
}

/** What `UserAccessService.getAccess` answers, computed from the fake tables. */
const accessFrom = (t: Tables, email: string): UserAccess => {
  const user = t.users.find((u) => u.email === email);
  const roles = t.user_roles
    .filter((ur) => ur.user_id === user.id && ur.is_active)
    .map((ur) => t.roles.find((r) => r.id === ur.role_id))
    .filter((r) => r.is_active);
  const permissions = t.role_permission
    .filter((g) => g.is_active && roles.some((r) => r.id === g.role_id))
    .map((g) => t.permissions.find((p) => p.id === g.permission_id))
    .filter((p) => p.is_active)
    .map((p) => p.name);
  return {
    userId: user.id,
    email,
    roles: roles.map((r) => ({
      id: r.id,
      acronym: r.acronym,
      description: r.description,
      level: r.level,
    })),
    permissions: [...new Set(permissions)],
    isSuper: roles.some((r) => r.level === 'super'),
  };
};

const as = (email: string, userId: number): UserData => ({
  userId,
  email,
  permissions: '',
});
const superAdmin = as('super@local.test', SUPER_USER);
const userManager = as('um@local.test', UM_USER);

describe('AccessAdminService', () => {
  let t: Tables;
  let repo: FakeRepository;
  let service: AccessAdminService;

  beforeEach(() => {
    t = seed();
    repo = new FakeRepository(t);
    const access = {
      getAccess: jest.fn(async (email: string) => accessFrom(t, email)),
    } as unknown as UserAccessService;
    service = new AccessAdminService(
      repo as unknown as AccessAdminRepository,
      access,
    );
  });

  const activeMembers = (roleId: number) =>
    t.user_roles
      .filter((ur) => ur.role_id === roleId && ur.is_active)
      .map((ur) => ur.user_id)
      .sort();

  describe('rule 1 — only a super grants or removes SA', () => {
    it('refuses a user manager granting SA, and writes nothing', async () => {
      const before = t.user_roles.length;
      await expect(
        service.addMembers(SA, { userIds: [300] }, userManager),
      ).rejects.toThrow(
        new ForbiddenException(ACCESS_ADMIN_ERRORS.onlySuperGrantsSuper),
      );
      expect(t.user_roles.length).toBe(before);
    });

    it('refuses a user manager removing an SA', async () => {
      t.user_roles.push({ id: 50, user_id: 101, role_id: SA, is_active: true });
      await expect(
        service.removeMember(
          SA,
          101,
          { justification: 'left team' },
          userManager,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(activeMembers(SA)).toEqual([SUPER_USER, 101].sort());
    });

    it('lets a super grant SA', async () => {
      await expect(
        service.addMembers(SA, { userIds: [300] }, superAdmin),
      ).resolves.toEqual({ added: [300], alreadyMembers: [] });
    });
  });

  describe('rule 2 — non-super callers only give what they hold', () => {
    it('refuses assigning a role whose permissions the caller lacks', async () => {
      // UM holds access-admin + glossary, not Concepts.
      await expect(
        service.addMembers(CONCEPTS, { userIds: [300] }, userManager),
      ).rejects.toThrow(new ForbiddenException(ACCESS_ADMIN_ERRORS.notSubset));
      expect(activeMembers(CONCEPTS)).toEqual([]);
    });

    it('allows assigning a role that is a subset of the caller', async () => {
      await expect(
        service.addMembers(GLOSS, { userIds: [300] }, userManager),
      ).resolves.toEqual({ added: [300], alreadyMembers: [] });
    });

    it('refuses creating a role with a permission the caller lacks', async () => {
      await expect(
        service.createRole(
          { acronym: 'X', description: 'Sneaky', permissionIds: [P_CONCEPTS] },
          userManager,
        ),
      ).rejects.toThrow(new ForbiddenException(ACCESS_ADMIN_ERRORS.notSubset));
      expect(t.roles.some((r) => r.acronym === 'X')).toBe(false);
    });

    it('refuses adding a permission the caller lacks to an existing role', async () => {
      await expect(
        service.setRolePermissions(
          GLOSS,
          { permissionIds: [P_GLOSS, P_BULK] },
          userManager,
        ),
      ).rejects.toThrow(new ForbiddenException(ACCESS_ADMIN_ERRORS.notSubset));
    });

    it('refuses editing a role that opens something the caller lacks', async () => {
      await expect(
        service.updateRole(CONCEPTS, { description: 'Renamed' }, userManager),
      ).rejects.toThrow(new ForbiddenException(ACCESS_ADMIN_ERRORS.notSubset));
    });

    it('lets a super give any active permission', async () => {
      const role = await service.createRole(
        {
          acronym: 'concepts_x',
          description: 'Concepts X',
          permissionIds: [P_CONCEPTS, P_BULK],
        },
        superAdmin,
      );
      expect(role).toMatchObject({
        acronym: 'CONCEPTS_X',
        level: 'module',
        isSystem: false,
        permissionIds: [P_CONCEPTS, P_BULK],
      });
    });
  });

  describe('rule 3 — the last active SuperAdmin stays', () => {
    it('refuses removing the only active SA', async () => {
      await expect(
        service.removeMember(
          SA,
          SUPER_USER,
          { justification: 'testing' },
          superAdmin,
        ),
      ).rejects.toThrow(new ConflictException(ACCESS_ADMIN_ERRORS.lastSuper));
      expect(activeMembers(SA)).toEqual([SUPER_USER]);
    });

    it('does not count an inactive user as a remaining SA', async () => {
      t.user_roles.push({ id: 50, user_id: 101, role_id: SA, is_active: true });
      t.users.find((u) => u.id === 101).is_active = false;
      await expect(
        service.removeMember(
          SA,
          SUPER_USER,
          { justification: 'testing' },
          superAdmin,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows removing an SA while another active one remains', async () => {
      t.user_roles.push({ id: 50, user_id: 101, role_id: SA, is_active: true });
      await expect(
        service.removeMember(
          SA,
          101,
          { justification: 'left the team' },
          superAdmin,
        ),
      ).resolves.toEqual({ removed: true });
      expect(activeMembers(SA)).toEqual([SUPER_USER]);
    });

    it('takes the SA row lock before counting', async () => {
      t.user_roles.push({ id: 50, user_id: 101, role_id: SA, is_active: true });
      await service.removeMember(
        SA,
        101,
        { justification: 'left' },
        superAdmin,
      );
      expect(repo.locks).toContain(SA);
      expect(repo.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('rule 4 — system roles and levels', () => {
    it.each([
      [
        'updateRole',
        () => service.updateRole(MS, { description: 'x y z' }, superAdmin),
      ],
      [
        'setRolePermissions',
        () => service.setRolePermissions(SA, { permissionIds: [] }, superAdmin),
      ],
    ])('%s refuses a system role, even for a super', async (_name, call) => {
      await expect(call()).rejects.toThrow(
        new ForbiddenException(ACCESS_ADMIN_ERRORS.systemRole),
      );
      expect(
        t.role_permission.filter((g) => g.role_id === SA && g.is_active),
      ).toHaveLength(4);
    });

    it('refuses a non-super editing the user_admin role', async () => {
      await expect(
        service.setRolePermissions(
          UM,
          { permissionIds: [P_GLOSS] },
          userManager,
        ),
      ).rejects.toThrow(
        new ForbiddenException(ACCESS_ADMIN_ERRORS.onlySuperEditsNonModule),
      );
    });

    it('lets a super edit the user_admin role', async () => {
      const role = await service.setRolePermissions(
        UM,
        { permissionIds: [P_ACCESS, P_GLOSS, P_CONCEPTS] },
        superAdmin,
      );
      expect(role.permissionIds).toEqual([P_ACCESS, P_CONCEPTS, P_GLOSS]);
    });
  });

  describe('rule 5 — idempotent assignment', () => {
    it('a repeated bulk assignment writes no second row', async () => {
      await service.addMembers(GLOSS, { userIds: [300, 301, 302] }, superAdmin);
      const rows = t.user_roles.length;
      await expect(
        service.addMembers(GLOSS, { userIds: [300, 301, 302] }, superAdmin),
      ).resolves.toEqual({ added: [], alreadyMembers: [300, 301, 302] });
      expect(t.user_roles.length).toBe(rows);
    });

    it('reports added and alreadyMembers separately in one call', async () => {
      await service.addMembers(GLOSS, { userIds: [300] }, superAdmin);
      await expect(
        service.addMembers(GLOSS, { userIds: [300, 301] }, superAdmin),
      ).resolves.toEqual({ added: [301], alreadyMembers: [300] });
    });

    it('re-granting reactivates the same user_roles row', async () => {
      t.user_roles.push({
        id: 77,
        user_id: 300,
        role_id: GLOSS,
        is_active: false,
      });
      const rows = t.user_roles.length;
      await expect(
        service.addMembers(GLOSS, { userIds: [300] }, superAdmin),
      ).resolves.toEqual({ added: [300], alreadyMembers: [] });
      expect(t.user_roles.length).toBe(rows);
      expect(t.user_roles.find((r) => r.id === 77)).toMatchObject({
        is_active: true,
        updated_by: SUPER_USER,
      });
    });

    it('locks the role row inside one transaction', async () => {
      await service.addMembers(GLOSS, { userIds: [300] }, superAdmin);
      expect(repo.transaction).toHaveBeenCalledTimes(1);
      expect(repo.locks).toEqual([GLOSS]);
    });

    it('refuses unknown users before writing anything', async () => {
      await expect(
        service.addMembers(GLOSS, { userIds: [300, 9999] }, superAdmin),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(activeMembers(GLOSS)).toEqual([]);
    });

    it('refuses adding people to an inactive role', async () => {
      t.roles.find((r) => r.id === GLOSS).is_active = false;
      await expect(
        service.addMembers(GLOSS, { userIds: [300] }, superAdmin),
      ).rejects.toThrow(
        new ConflictException(ACCESS_ADMIN_ERRORS.inactiveRole),
      );
    });

    it('answers 404 for an unknown role', async () => {
      await expect(
        service.addMembers(999, { userIds: [300] }, superAdmin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('rule 6 — removal deactivates with a justification', () => {
    it('deactivates the row and records who and why', async () => {
      await service.addMembers(GLOSS, { userIds: [300] }, superAdmin);
      await expect(
        service.removeMember(
          GLOSS,
          300,
          { justification: 'Moved to another team' },
          userManager,
        ),
      ).resolves.toEqual({ removed: true });
      const row = t.user_roles.find(
        (r) => r.user_id === 300 && r.role_id === GLOSS,
      );
      expect(row).toMatchObject({
        is_active: false,
        updated_by: UM_USER,
        modification_justification: 'Moved to another team',
      });
    });

    it('a repeated removal writes nothing and says so', async () => {
      await service.addMembers(GLOSS, { userIds: [300] }, superAdmin);
      await service.removeMember(
        GLOSS,
        300,
        { justification: 'first call' },
        superAdmin,
      );
      await expect(
        service.removeMember(
          GLOSS,
          300,
          { justification: 'second call' },
          superAdmin,
        ),
      ).resolves.toEqual({ removed: false });
      expect(
        t.user_roles.find((r) => r.user_id === 300 && r.role_id === GLOSS)
          .modification_justification,
      ).toBe('first call');
    });
  });

  describe('rule 7 — roles are deactivated, never deleted', () => {
    it('deactivating a role with members keeps the role and its memberships', async () => {
      await service.addMembers(GLOSS, { userIds: [300, 301] }, superAdmin);
      const role = await service.updateRole(
        GLOSS,
        { isActive: false, justification: 'Not needed' },
        superAdmin,
      );
      expect(role).toMatchObject({ id: GLOSS, isActive: false });
      expect(t.roles.some((r) => r.id === GLOSS)).toBe(true);
      expect(activeMembers(GLOSS)).toEqual([300, 301]);
    });

    it('the repository offers no way to delete a role or a membership', () => {
      const methods = Object.getOwnPropertyNames(
        AccessAdminRepository.prototype,
      );
      expect(methods.filter((m) => /delete|remove|drop/i.test(m))).toEqual([]);
    });
  });

  describe('creating roles', () => {
    it('refuses a duplicate acronym (case-insensitive)', async () => {
      await expect(
        service.createRole(
          {
            acronym: 'gloss',
            description: 'Other glossary',
            permissionIds: [],
          },
          superAdmin,
        ),
      ).rejects.toThrow(
        new ConflictException(ACCESS_ADMIN_ERRORS.duplicateAcronym),
      );
    });

    it('takes the acronym lock before any plain read (parallel double submit)', async () => {
      await service.createRole(
        {
          acronym: 'MDA',
          description: 'Concepts Data Admins',
          permissionIds: [P_CONCEPTS],
        },
        superAdmin,
      );
      expect(repo.calls[0]).toBe('findRolesByAcronym:true');
    });

    it('a repeated submit of the same form returns the same role', async () => {
      const dto = {
        acronym: 'MDA',
        description: 'Concepts Data Admins',
        permissionIds: [P_CONCEPTS],
      };
      const first = await service.createRole(dto, superAdmin);
      const rows = t.roles.length;
      const second = await service.createRole(dto, superAdmin);
      expect(second.id).toBe(first.id);
      expect(t.roles.length).toBe(rows);
    });

    it('refuses unknown or inactive permissions', async () => {
      await expect(
        service.createRole(
          { acronym: 'NEW', description: 'New role', permissionIds: [P_OLD] },
          superAdmin,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('setRolePermissions', () => {
    it('deactivates, reactivates and inserts without deleting', async () => {
      t.role_permission.push({
        id: 90,
        role_id: GLOSS,
        permission_id: P_BULK,
        is_active: false,
      });
      await service.setRolePermissions(
        GLOSS,
        { permissionIds: [P_BULK, P_CONCEPTS] },
        superAdmin,
      );
      const rows = t.role_permission.filter((g) => g.role_id === GLOSS);
      expect(rows.find((g) => g.permission_id === P_GLOSS)).toMatchObject({
        is_active: false,
      });
      expect(rows.find((g) => g.id === 90)).toMatchObject({ is_active: true });
      expect(rows.filter((g) => g.permission_id === P_CONCEPTS)).toHaveLength(
        1,
      );
      expect(rows).toHaveLength(3);
    });
  });

  describe('reads', () => {
    it('groups active permissions by module, labels fall back to the name, Other last', async () => {
      const groups = await service.listPermissions();
      expect(groups.map((g) => g.module)).toEqual([
        'Access',
        'Concepts',
        'Glossary',
        OTHER_MODULE,
      ]);
      expect(groups[3].items).toEqual([
        {
          id: P_BULK,
          name: '/api/institutions/create-bulk',
          label: '/api/institutions/create-bulk',
          description: null,
        },
      ]);
      expect(groups.flatMap((g) => g.items).some((p) => p.id === P_OLD)).toBe(
        false,
      );
    });

    it('lists users with their roles and paging defaults', async () => {
      const page = await service.listUsers({});
      expect(page).toMatchObject({ total: 6, page: 1, pageSize: 20 });
      expect(page.items.find((u) => u.id === UM_USER).roles).toEqual([
        { id: UM, acronym: 'UM', description: 'User Manager' },
      ]);
      expect(page.items.find((u) => u.id === 300).roles).toEqual([]);
    });

    it('filters users without a role', async () => {
      const page = await service.listUsers({ withoutRole: true });
      expect(page.items.map((u) => u.id)).toEqual([101, 300, 301, 302]);
    });

    it('lists the members of a role', async () => {
      await service.addMembers(GLOSS, { userIds: [301] }, superAdmin);
      const page = await service.listMembers(GLOSS, { page: 1, pageSize: 5 });
      expect(page.items.map((u) => u.id)).toEqual([301]);
    });
  });
});
