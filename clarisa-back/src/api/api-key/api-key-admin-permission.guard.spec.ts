import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { AddApiKeysAdminPermission1790600300000 } from '../../../migrations/1790600300000-AddApiKeysAdminPermission';

/**
 * The real PermissionGuard (path substring match) with the permission the
 * migration grants to SA: it opens every route of `ApiKeyController` and a
 * module admin (MELIAF only) is refused.
 */
describe('PermissionGuard with the API keys admin permission', () => {
  const ROUTE = AddApiKeysAdminPermission1790600300000.ROUTE;

  const guardFor = (permissions: string[]) => {
    const users = {
      findOneByEmail: jest.fn(async () => ({
        id: 9,
        email: 'someone@clarisa.test',
        permissions,
      })),
    };
    const moduleRef = { get: () => users } as unknown as ModuleRef;
    const reflector = { get: () => undefined } as unknown as Reflector;
    return new PermissionGuard(reflector, moduleRef);
  };
  const ctx = (url: string) =>
    ({
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: { email: 'someone@clarisa.test' },
          originalUrl: url,
        }),
      }),
    }) as unknown as ExecutionContext;

  const routes = [
    '/api/api-keys',
    '/api/api-keys?show=all',
    '/api/api-keys/create',
    '/api/api-keys/scopes',
    '/api/api-keys/usage/overview',
    '/api/api-keys/usage/summary',
    '/api/api-keys/usage/logs',
    '/api/api-keys/usage/endpoints',
    '/api/api-keys/usage/mis-activity',
    '/api/api-keys/5/usage',
    '/api/api-keys/get/5',
    '/api/api-keys/5',
    '/api/api-keys/5/revoke',
    '/api/api-keys/5/rotate',
  ];

  it('is the path the controller is mounted at', () => {
    expect(ROUTE).toBe('/api/api-keys');
  });

  it.each(routes)('/api/api-keys allows %s', async (url) => {
    await expect(guardFor([ROUTE]).canActivate(ctx(url))).resolves.toBe(true);
  });

  it.each(routes)('MELIAF-only is denied %s', async (url) => {
    await expect(
      guardFor(['/api/meliaf-taxonomy/admin']).canActivate(ctx(url)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a query string cannot smuggle the permission in', async () => {
    await expect(
      guardFor(['/api/api-keys']).canActivate(
        ctx('/api/mises/create?x=/api/api-keys'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a user without any permission is denied', async () => {
    await expect(
      guardFor([]).canActivate(ctx('/api/api-keys/usage/overview')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
