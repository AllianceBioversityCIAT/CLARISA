import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { PermissionRoute } from '../decorators/permission-route.decorator';
import { PermissionGuard } from './permission.guard';

/**
 * `@PermissionRoute(route)` makes the real PermissionGuard authorise a fixed
 * permission route instead of the request path (the same substring rule).
 * Used by `PATCH api/glossary/update`, whose path does not contain the
 * glossary admin permission it requires (2026-11-11).
 */
describe('PermissionGuard with @PermissionRoute', () => {
  class Routes {
    @PermissionRoute('/api/glossary/admin')
    pinned() {}

    plain() {}
  }

  const guardFor = (permissions: string[]) =>
    new PermissionGuard(new Reflector(), {
      get: () => ({
        findOneByEmail: jest.fn(async () => ({
          id: 9,
          email: 'someone@clarisa.test',
          permissions,
        })),
      }),
    } as unknown as ModuleRef);
  const ctx = (url: string, handler: () => void) =>
    ({
      getClass: () => Routes,
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { email: 'someone@clarisa.test' },
          originalUrl: url,
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() =>
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined),
  );
  afterEach(() => jest.restoreAllMocks());

  const UPDATE = '/api/glossary/update';

  it('the glossary admin permission opens a pinned route whose path does not contain it', async () => {
    await expect(
      guardFor(['/api/glossary/admin']).canActivate(
        ctx(UPDATE, Routes.prototype.pinned),
      ),
    ).resolves.toBe(true);
  });

  it('a permission that only matches the request path is not enough on a pinned route', async () => {
    await expect(
      guardFor([UPDATE]).canActivate(ctx(UPDATE, Routes.prototype.pinned)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guardFor(['/api/countries']).canActivate(
        ctx(UPDATE, Routes.prototype.pinned),
      ),
    ).rejects.toThrow(`User is not permitted to access route ${UPDATE}`);
  });

  it('without the decorator the request path is authorised, as before', async () => {
    await expect(
      guardFor(['/api/glossary/admin']).canActivate(
        ctx(UPDATE, Routes.prototype.plain),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guardFor([UPDATE]).canActivate(ctx(UPDATE, Routes.prototype.plain)),
    ).resolves.toBe(true);
  });
});
