import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** Most users one bulk "Assign role" may carry; keeps the transaction bounded. */
export const ACCESS_ADMIN_BULK_MAX_USERS = 500;
export const ACCESS_ADMIN_MAX_PAGE_SIZE = 100;
export const ACCESS_ADMIN_DEFAULT_PAGE_SIZE = 20;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Query strings arrive as text: `'true'`/`'1'` mean yes, anything else no. */
const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ACCESS_ADMIN_MAX_PAGE_SIZE)
  pageSize?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}

/** `GET api/access-admin/users` */
export class ListUsersQueryDto extends PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  withoutRole?: boolean;
}

/** `GET api/access-admin/roles/:id/members` */
export class ListMembersQueryDto extends PageQueryDto {}

class PermissionIdsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  permissionIds: number[];
}

/** `POST api/access-admin/roles` */
export class CreateRoleDto extends PermissionIdsDto {
  /** Short code, e.g. `MELIAF_DA`. Stored upper-case. */
  @Transform(trim)
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{2,50}$/, {
    message: 'acronym must be 2 to 50 letters, digits, "_" or "-" (no spaces)',
  })
  acronym: string;

  /** The name people see, e.g. "MELIAF Data Admins". */
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  description: string;
}

/** `PATCH api/access-admin/roles/:id` — every field optional. */
export class UpdateRoleDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{2,50}$/, {
    message: 'acronym must be 2 to 50 letters, digits, "_" or "-" (no spaces)',
  })
  acronym?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  description?: string;

  /** `false` deactivates the role (roles are never deleted). */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  justification?: string;
}

/** `PUT api/access-admin/roles/:id/permissions` */
export class SetRolePermissionsDto extends PermissionIdsDto {}

/** `POST api/access-admin/roles/:id/members` */
export class AddRoleMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ACCESS_ADMIN_BULK_MAX_USERS)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  userIds: number[];
}

/** `DELETE api/access-admin/roles/:id/members/:userId` */
export class RemoveRoleMemberDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'justification is required to remove a role' })
  @MinLength(5)
  @MaxLength(500)
  justification: string;
}

// ---- responses ----

export interface PageDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserRoleChipDto {
  id: number;
  acronym: string;
  description: string;
}

export interface AccessAdminUserDto {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  isCgiarUser: boolean;
  lastLogin: Date | null;
  isActive: boolean;
  roles: UserRoleChipDto[];
}

export interface AccessAdminRoleDto {
  id: number;
  acronym: string;
  description: string;
  isActive: boolean;
  isSystem: boolean;
  level: string;
  memberCount: number;
  permissionIds: number[];
}

export interface PermissionItemDto {
  id: number;
  name: string;
  label: string;
  description: string | null;
}

export interface PermissionGroupDto {
  module: string;
  items: PermissionItemDto[];
}

export interface AddMembersResultDto {
  /** Users who got the role now (new row or reactivated row). */
  added: number[];
  /** Users who already held it; nothing was written for them. */
  alreadyMembers: number[];
}

export interface RemoveMemberResultDto {
  /** `false` when the user did not hold the role (a repeated call). */
  removed: boolean;
}
