import { HttpErrorResponse } from '@angular/common/http';
import { AccessRole, MeAccess, PermissionGroup, RoleLevel } from './access-admin-api.service';

/**
 * Pure helpers of the Roles and Users administration: the back is the
 * authority on every rule (design.md § Levels and rules); these only mirror
 * them so the screen does not offer what the API will refuse.
 */

/**
 * Same test as the back's `PermissionGuard`: a route is open when it CONTAINS
 * one of the caller's permission names (`route.includes(p)`).
 */
export function permits(route: string, permissions: readonly string[] | null | undefined): boolean {
  return (permissions ?? []).some(p => !!p && route.includes(p));
}

export const LEVEL_LABEL: Record<RoleLevel, string> = {
  super: 'Super admin',
  user_admin: 'User admin',
  module: 'Module'
};

export function levelLabel(level: RoleLevel | undefined | null): string {
  return (level && LEVEL_LABEL[level]) || 'Module';
}

/** id → permission name, from the grouped catalog. */
export function permissionNames(groups: readonly PermissionGroup[]): Map<number, string> {
  const names = new Map<number, string>();
  groups.forEach(group => group.items.forEach(item => names.set(item.id, item.name)));
  return names;
}

/**
 * Roles the caller may hand out: a super, any; anyone else, never a `super`
 * role and only roles whose permissions are a subset of their own.
 */
export function assignableRoles(roles: readonly AccessRole[], access: MeAccess | null, catalog: readonly PermissionGroup[]): AccessRole[] {
  if (!access) return [];
  const active = roles.filter(role => role.isActive !== false);
  if (access.isSuper) return active;

  const names = permissionNames(catalog);
  const mine = new Set(access.permissions);
  return active.filter(role => role.level !== 'super' && role.permissionIds.every(id => mine.has(names.get(id) ?? '')));
}

/** Whether the caller holds a given permission (used to lock checkboxes they cannot grant). */
export function holdsPermission(name: string, access: MeAccess | null): boolean {
  return !!access && (access.isSuper || access.permissions.includes(name));
}

export function fullName(user: { firstName?: string | null; lastName?: string | null; email?: string | null }): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || '—';
}

/** The back sends either Nest's `{ message }` (string or list) or CLARISA's `{ description }`. */
function backMessage(error: HttpErrorResponse): string {
  const body = error?.error;
  if (!body) return '';
  if (typeof body === 'string') return body.length < 300 ? body : '';
  const raw = body.message ?? body.description ?? '';
  const text = Array.isArray(raw) ? raw.join('; ') : String(raw);
  return text.length < 300 ? text : '';
}

/**
 * The back's refusal, as a sentence a person can act on. `action` names what
 * was attempted, e.g. "assign the role".
 */
export function accessErrorMessage(error: unknown, action: string): string {
  const http = error as HttpErrorResponse;
  const detail = backMessage(http);
  const tail = detail ? ` (${detail})` : '';

  switch (http?.status) {
    case 0:
      return `Could not ${action}: CLARISA did not answer. Check your connection and try again.`;
    case 400:
      return `Could not ${action}: some of the data was not accepted${tail}.`;
    case 403:
      return `Your roles do not allow you to ${action}. You can only grant roles and permissions you hold yourself, and only a Super admin can grant Super admin.`;
    case 404:
      return `Could not ${action}: it no longer exists. Reload the list.`;
    case 409:
      return `Could not ${action}: it conflicts with the current data${tail}.`;
    default:
      return `Could not ${action}: the server failed${http?.status ? ` (HTTP ${http.status})` : ''}. Try again in a moment.`;
  }
}
