import { SetMetadata } from '@nestjs/common';

export const PERMISSION_ROUTE = 'permissionRoute';

/**
 * `PermissionGuard` authorises `route` (same substring rule) instead of the
 * request path, for a handler whose path does not contain the permission it
 * requires — e.g. `PATCH api/glossary/update` needs `/api/glossary/admin`.
 */
export const PermissionRoute = (route: string) =>
  SetMetadata(PERMISSION_ROUTE, route);
