import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Client of the Roles and Users administration (`api/access-admin`) plus the
 * caller's own access (`api/users/me/access`). Shapes follow the approved
 * contract in `openspec/changes/add-roles-users-admin/design.md`; every call
 * goes through the global auth interceptor, which adds the bearer token.
 */

export type RoleLevel = 'super' | 'user_admin' | 'module';

export interface RoleRef {
  id: number;
  acronym: string;
  description: string;
  level?: RoleLevel;
}

export interface MeAccess {
  userId: number;
  email: string;
  roles: RoleRef[];
  /** Permission names, which in CLARISA are route prefixes (`/api/glossary/admin`). */
  permissions: string[];
  isSuper: boolean;
}

export interface AccessUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  isCgiarUser: boolean;
  lastLogin: string | null;
  isActive: boolean;
  roles: RoleRef[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AccessRole {
  id: number;
  acronym: string;
  description: string;
  level: RoleLevel;
  isSystem: boolean;
  memberCount: number;
  permissionIds: number[];
  isActive?: boolean;
}

/** Limits the back's DTOs enforce (`access-admin.dto.ts`), mirrored to warn before sending. */
export const ACCESS_LIMITS = {
  acronymPattern: /^[A-Za-z0-9_-]{2,50}$/,
  descriptionMin: 3,
  descriptionMax: 255,
  justificationMin: 5,
  justificationMax: 500,
  pageSizeMax: 100,
  bulkMax: 500
} as const;

export interface AccessPermission {
  id: number;
  name: string;
  label: string | null;
  description: string | null;
}

export interface PermissionGroup {
  module: string | null;
  items: AccessPermission[];
}

export interface UserQuery {
  search?: string;
  roleId?: number | null;
  withoutRole?: boolean;
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface MemberQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface RoleBody {
  acronym: string;
  description: string;
  permissionIds: number[];
}

/** The back answers with the user ids of each outcome; a plain count is accepted too. */
export interface AddMembersResult {
  added: number[] | number;
  alreadyMembers: number[] | number;
}

export function countOf(value: number[] | number | null | undefined): number {
  return Array.isArray(value) ? value.length : Number(value) || 0;
}

@Injectable({ providedIn: 'root' })
export class AccessAdminApiService {
  private readonly base = `${environment.apiUrl}api/access-admin`;

  constructor(private readonly _http: HttpClient) {}

  me(): Observable<MeAccess> {
    return this._http.get<MeAccess>(`${environment.apiUrl}api/users/me/access`);
  }

  users(query: UserQuery = {}): Observable<Page<AccessUser>> {
    let params = new HttpParams();
    const search = query.search?.trim();
    if (search) params = params.set('search', search);
    if (query.withoutRole) {
      params = params.set('withoutRole', 'true');
    } else if (query.roleId) {
      // «Without role» and «has role X» contradict each other: the toggle wins.
      params = params.set('roleId', String(query.roleId));
    }
    params = params.set('page', String(query.page ?? 1)).set('pageSize', String(query.pageSize ?? 20));
    return this._http.get<Page<AccessUser>>(`${this.base}/users`, { params });
  }

  roles(): Observable<AccessRole[]> {
    return this._http.get<AccessRole[]>(`${this.base}/roles`);
  }

  createRole(body: RoleBody): Observable<AccessRole> {
    return this._http.post<AccessRole>(`${this.base}/roles`, body);
  }

  updateRole(id: number, body: Partial<Pick<RoleBody, 'acronym' | 'description'>>): Observable<AccessRole> {
    return this._http.patch<AccessRole>(`${this.base}/roles/${id}`, body);
  }

  setRolePermissions(id: number, permissionIds: number[]): Observable<unknown> {
    return this._http.put(`${this.base}/roles/${id}/permissions`, { permissionIds });
  }

  members(roleId: number, query: MemberQuery = {}): Observable<Page<AccessUser>> {
    let params = new HttpParams();
    const search = query.search?.trim();
    if (search) params = params.set('search', search);
    params = params.set('page', String(query.page ?? 1));
    if (query.pageSize) params = params.set('pageSize', String(query.pageSize));
    return this._http.get<Page<AccessUser>>(`${this.base}/roles/${roleId}/members`, { params });
  }

  addMembers(roleId: number, userIds: number[]): Observable<AddMembersResult> {
    return this._http.post<AddMembersResult>(`${this.base}/roles/${roleId}/members`, { userIds });
  }

  removeMember(roleId: number, userId: number, justification: string): Observable<unknown> {
    return this._http.delete(`${this.base}/roles/${roleId}/members/${userId}`, { body: { justification: justification.trim() } });
  }

  permissions(): Observable<PermissionGroup[]> {
    return this._http.get<PermissionGroup[]>(`${this.base}/permissions`);
  }
}
