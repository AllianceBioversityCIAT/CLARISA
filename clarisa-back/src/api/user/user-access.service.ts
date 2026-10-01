import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserService } from './user.service';

/** `roles.level`: who may grant a role (see access-admin design). */
export enum RoleLevel {
  SUPER = 'super',
  USER_ADMIN = 'user_admin',
  MODULE = 'module',
}

export interface AccessRole {
  id: number;
  acronym: string;
  description: string;
  level: RoleLevel | string;
}

/** Answer of `GET api/users/me/access`. */
export interface UserAccess {
  userId: number;
  email: string;
  roles: AccessRole[];
  /** Exactly what `PermissionGuard` authorises this user with. */
  permissions: string[];
  isSuper: boolean;
}

/**
 * What the signed-in user can open. `permissions` comes from the same source
 * `PermissionGuard` uses (`UserService.findOneByEmail` → `getUserPermissions`),
 * so the panel menu and the back never disagree about a route.
 */
@Injectable()
export class UserAccessService {
  constructor(
    private readonly _userService: UserService,
    private readonly _dataSource: DataSource,
  ) {}

  async getAccess(email: string): Promise<UserAccess> {
    const user = email ? await this._userService.findOneByEmail(email) : null;
    if (!user) {
      throw new UnauthorizedException('Authenticated user was not found');
    }

    const rows: Array<{
      id: number | string;
      acronym: string;
      description: string;
      level: string | null;
    }> = await this._dataSource.query(
      `SELECT DISTINCT r.id, r.acronym, r.description, r.level, r.\`order\`
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id AND r.is_active = 1
        WHERE ur.user_id = ? AND ur.is_active = 1
        ORDER BY r.\`order\`, r.id`,
      [user.id],
    );

    const roles: AccessRole[] = rows.map((r) => ({
      id: Number(r.id),
      acronym: r.acronym,
      description: r.description,
      level: r.level ?? RoleLevel.MODULE,
    }));

    return {
      userId: Number(user.id),
      email: user.email,
      roles,
      permissions: [...new Set(user.permissions ?? [])],
      isSuper: roles.some((r) => r.level === RoleLevel.SUPER),
    };
  }
}
