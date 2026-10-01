import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRoleChipDto } from './dto/access-admin.dto';

/** Anything that runs SQL: the DataSource or a transaction's EntityManager. */
export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<any>;
}

export interface RoleRow {
  id: number;
  acronym: string;
  description: string;
  isActive: boolean;
  isSystem: boolean;
  level: string;
}

export interface PermissionRow {
  id: number;
  name: string;
  isActive: boolean;
}

export interface MembershipRow {
  id: number;
  userId: number;
  isActive: boolean;
}

export interface GrantRow {
  id: number;
  permissionId: number;
  isActive: boolean;
}

export interface UserRow {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  isCgiarUser: boolean;
  lastLogin: Date | null;
  isActive: boolean;
}

export interface UserFilter {
  search?: string;
  roleId?: number;
  withoutRole?: boolean;
  offset: number;
  limit: number;
}

const ROLE_COLUMNS = `r.id, r.acronym, r.description, r.is_active, r.is_system, r.level`;

const toRole = (r: any): RoleRow => ({
  id: Number(r.id),
  acronym: r.acronym,
  description: r.description,
  isActive: Number(r.is_active) === 1,
  isSystem: Number(r.is_system) === 1,
  level: r.level ?? 'module',
});

/** `%` and `_` typed by the admin are literal characters, not wildcards. */
const likeTerm = (search: string) =>
  `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * SQL of the access-admin module. The five auth tables are shared by every
 * guarded endpoint, so writes here are the narrowest possible (single rows,
 * never a DELETE) and every read filters `is_active` explicitly.
 */
@Injectable()
export class AccessAdminRepository {
  constructor(private readonly _dataSource: DataSource) {}

  get db(): Queryable {
    return this._dataSource;
  }

  transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T> {
    return this._dataSource.transaction((manager) => work(manager));
  }

  // ---------- reads ----------

  async listUsers(
    filter: UserFilter,
  ): Promise<{ rows: UserRow[]; total: number }> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filter.search) {
      const term = likeTerm(filter.search);
      where.push(
        `(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.username LIKE ?
          OR CONCAT_WS(' ', u.first_name, u.last_name) LIKE ?)`,
      );
      params.push(term, term, term, term, term);
    }
    if (filter.roleId) {
      where.push(
        `EXISTS (SELECT 1 FROM user_roles ur
                  WHERE ur.user_id = u.id AND ur.role_id = ? AND ur.is_active = 1)`,
      );
      params.push(filter.roleId);
    }
    if (filter.withoutRole) {
      where.push(
        `NOT EXISTS (SELECT 1 FROM user_roles ur
                       JOIN roles r ON r.id = ur.role_id AND r.is_active = 1
                      WHERE ur.user_id = u.id AND ur.is_active = 1)`,
      );
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [{ total }] = await this.db.query(
      `SELECT COUNT(*) AS total FROM users u ${whereSql}`,
      params,
    );
    const rows = await this.db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.is_cgiar_user,
              u.last_login, u.is_active
         FROM users u ${whereSql}
        ORDER BY u.first_name, u.last_name, u.id
        LIMIT ? OFFSET ?`,
      [...params, filter.limit, filter.offset],
    );

    return {
      total: Number(total),
      rows: rows.map((u: any) => ({
        id: Number(u.id),
        firstName: u.first_name ?? null,
        lastName: u.last_name ?? null,
        email: u.email,
        isCgiarUser: Number(u.is_cgiar_user) === 1,
        lastLogin: u.last_login ?? null,
        isActive: Number(u.is_active) === 1,
      })),
    };
  }

  /** Active roles of each user, as chips. */
  async rolesOfUsers(
    userIds: number[],
  ): Promise<Map<number, UserRoleChipDto[]>> {
    const result = new Map<number, UserRoleChipDto[]>();
    if (!userIds.length) return result;
    const rows = await this.db.query(
      `SELECT DISTINCT ur.user_id, r.id, r.acronym, r.description, r.\`order\`
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id AND r.is_active = 1
        WHERE ur.user_id IN (?) AND ur.is_active = 1
        ORDER BY r.\`order\`, r.id`,
      [userIds],
    );
    for (const row of rows) {
      const userId = Number(row.user_id);
      const list = result.get(userId) ?? [];
      list.push({
        id: Number(row.id),
        acronym: row.acronym,
        description: row.description,
      });
      result.set(userId, list);
    }
    return result;
  }

  async listRoles(): Promise<
    Array<RoleRow & { memberCount: number; permissionIds: number[] }>
  > {
    const roles = await this.db.query(
      `SELECT ${ROLE_COLUMNS},
              (SELECT COUNT(DISTINCT ur.user_id)
                 FROM user_roles ur
                 JOIN users u ON u.id = ur.user_id AND u.is_active = 1
                WHERE ur.role_id = r.id AND ur.is_active = 1) AS member_count
         FROM roles r
        ORDER BY r.\`order\`, r.id`,
    );
    const grants = await this.db.query(
      `SELECT DISTINCT rp.role_id, rp.permission_id
         FROM role_permission rp
         JOIN permissions p ON p.id = rp.permission_id AND p.is_active = 1
        WHERE rp.is_active = 1
        ORDER BY rp.permission_id`,
    );
    const byRole = new Map<number, number[]>();
    for (const g of grants) {
      const list = byRole.get(Number(g.role_id)) ?? [];
      list.push(Number(g.permission_id));
      byRole.set(Number(g.role_id), list);
    }
    return roles.map((r: any) => ({
      ...toRole(r),
      memberCount: Number(r.member_count ?? 0),
      permissionIds: byRole.get(Number(r.id)) ?? [],
    }));
  }

  async listPermissions(): Promise<
    Array<{
      id: number;
      name: string;
      module: string | null;
      label: string | null;
      description: string | null;
    }>
  > {
    const rows = await this.db.query(
      `SELECT id, name, module, label, description
         FROM permissions
        WHERE is_active = 1
        ORDER BY module IS NULL, module, COALESCE(label, name), id`,
    );
    return rows.map((p: any) => ({
      id: Number(p.id),
      name: p.name,
      module: p.module ?? null,
      label: p.label ?? null,
      description: p.description ?? null,
    }));
  }

  async findRole(q: Queryable, id: number, lock = false): Promise<RoleRow> {
    const rows = await q.query(
      `SELECT ${ROLE_COLUMNS} FROM roles r WHERE r.id = ?${lock ? ' FOR UPDATE' : ''}`,
      [id],
    );
    return rows[0] ? toRole(rows[0]) : null;
  }

  /**
   * Case-insensitive acronym lookup. With `lock` it is a locking read over
   * the whole (small, unindexed) table, which serialises two concurrent
   * creates of the same role: the second one waits and then sees the first.
   */
  async findRolesByAcronym(
    q: Queryable,
    acronym: string,
    lock = false,
  ): Promise<RoleRow[]> {
    const rows = await q.query(
      `SELECT ${ROLE_COLUMNS} FROM roles r
        WHERE UPPER(r.acronym) = UPPER(?)${lock ? ' FOR UPDATE' : ''}`,
      [acronym],
    );
    return rows.map(toRole);
  }

  /** Active permissions actually granted (active grant) to a role. */
  async rolePermissions(
    q: Queryable,
    roleId: number,
  ): Promise<PermissionRow[]> {
    const rows = await q.query(
      `SELECT DISTINCT p.id, p.name, p.is_active
         FROM role_permission rp
         JOIN permissions p ON p.id = rp.permission_id AND p.is_active = 1
        WHERE rp.role_id = ? AND rp.is_active = 1`,
      [roleId],
    );
    return rows.map((p: any) => ({
      id: Number(p.id),
      name: p.name,
      isActive: Number(p.is_active) === 1,
    }));
  }

  async permissionsByIds(
    q: Queryable,
    ids: number[],
  ): Promise<PermissionRow[]> {
    if (!ids.length) return [];
    const rows = await q.query(
      `SELECT id, name, is_active FROM permissions WHERE id IN (?)`,
      [ids],
    );
    return rows.map((p: any) => ({
      id: Number(p.id),
      name: p.name,
      isActive: Number(p.is_active) === 1,
    }));
  }

  async existingUserIds(q: Queryable, ids: number[]): Promise<number[]> {
    if (!ids.length) return [];
    const rows = await q.query(`SELECT id FROM users WHERE id IN (?)`, [ids]);
    return rows.map((u: any) => Number(u.id));
  }

  /** Every row (active or not) linking these users to the role. */
  async memberships(
    q: Queryable,
    roleId: number,
    userIds: number[],
  ): Promise<MembershipRow[]> {
    if (!userIds.length) return [];
    const rows = await q.query(
      `SELECT id, user_id, is_active FROM user_roles
        WHERE role_id = ? AND user_id IN (?)
        ORDER BY is_active DESC, id DESC`,
      [roleId, userIds],
    );
    return rows.map((m: any) => ({
      id: Number(m.id),
      userId: Number(m.user_id),
      isActive: Number(m.is_active) === 1,
    }));
  }

  /**
   * Active users holding an active `super` role, other than `excludeUserId`.
   * Called under the SA row lock, so two concurrent removals cannot both see
   * "one left".
   */
  async countOtherActiveSupers(
    q: Queryable,
    excludeUserId: number,
  ): Promise<number> {
    const [{ n }] = await q.query(
      `SELECT COUNT(DISTINCT ur.user_id) AS n
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id AND r.level = 'super' AND r.is_active = 1
         JOIN users u ON u.id = ur.user_id AND u.is_active = 1
        WHERE ur.is_active = 1 AND ur.user_id <> ?`,
      [excludeUserId],
    );
    return Number(n);
  }

  async grants(q: Queryable, roleId: number): Promise<GrantRow[]> {
    const rows = await q.query(
      `SELECT id, permission_id, is_active FROM role_permission
        WHERE role_id = ? ORDER BY is_active DESC, id DESC`,
      [roleId],
    );
    return rows.map((g: any) => ({
      id: Number(g.id),
      permissionId: Number(g.permission_id),
      isActive: Number(g.is_active) === 1,
    }));
  }

  // ---------- writes (always inside a transaction) ----------

  async insertMembership(
    q: Queryable,
    userId: number,
    roleId: number,
    by: number,
  ): Promise<void> {
    await q.query(
      `INSERT INTO user_roles (user_id, role_id, is_active, created_by)
       VALUES (?, ?, 1, ?)`,
      [userId, roleId, by],
    );
  }

  async reactivateMembership(
    q: Queryable,
    id: number,
    by: number,
  ): Promise<void> {
    await q.query(
      `UPDATE user_roles
          SET is_active = 1, updated_by = ?,
              modification_justification = 'Role granted again'
        WHERE id = ?`,
      [by, id],
    );
  }

  async deactivateMemberships(
    q: Queryable,
    ids: number[],
    by: number,
    justification: string,
  ): Promise<void> {
    if (!ids.length) return;
    await q.query(
      `UPDATE user_roles
          SET is_active = 0, updated_by = ?, modification_justification = ?
        WHERE id IN (?)`,
      [by, justification, ids],
    );
  }

  async insertRole(
    q: Queryable,
    acronym: string,
    description: string,
    by: number,
  ): Promise<number> {
    // New roles go last in `order`; `module` level and never system.
    const result = await q.query(
      `INSERT INTO roles (acronym, description, \`order\`, is_system, level, is_active, created_by)
       SELECT ?, ?, COALESCE(MAX(\`order\`), 0) + 1, 0, 'module', 1, ? FROM roles`,
      [acronym, description, by],
    );
    return Number(result?.insertId);
  }

  async updateRole(
    q: Queryable,
    id: number,
    fields: { acronym?: string; description?: string; isActive?: boolean },
    by: number,
    justification?: string,
  ): Promise<void> {
    const sets: string[] = ['updated_by = ?'];
    const params: unknown[] = [by];
    if (fields.acronym !== undefined) {
      sets.push('acronym = ?');
      params.push(fields.acronym);
    }
    if (fields.description !== undefined) {
      sets.push('description = ?');
      params.push(fields.description);
    }
    if (fields.isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(fields.isActive ? 1 : 0);
    }
    if (justification) {
      sets.push('modification_justification = ?');
      params.push(justification);
    }
    await q.query(`UPDATE roles SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
  }

  async insertGrant(
    q: Queryable,
    roleId: number,
    permissionId: number,
    by: number,
  ): Promise<void> {
    await q.query(
      `INSERT INTO role_permission (role_id, permission_id, is_active, created_by)
       VALUES (?, ?, 1, ?)`,
      [roleId, permissionId, by],
    );
  }

  async setGrantsActive(
    q: Queryable,
    ids: number[],
    active: boolean,
    by: number,
  ): Promise<void> {
    if (!ids.length) return;
    await q.query(
      `UPDATE role_permission SET is_active = ?, updated_by = ? WHERE id IN (?)`,
      [active ? 1 : 0, by, ids],
    );
  }
}
