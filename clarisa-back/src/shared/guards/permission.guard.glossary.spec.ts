// LDAPAuth reads src/shared/config/config.ts, which is git-ignored and absent in
// CI; routes.ts pulls the auth module in through its imports.
jest.mock('../../auth/utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));

import {
  ExecutionContext,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector, ModuleRef } from '@nestjs/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { apiRoutes } from '../../api/api.routes';
import { GlossaryAdminController } from '../../api/glossary/glossary-admin.controller';
import { GlossaryModule } from '../../api/glossary/glossary.module';
import { SeedGlossaryAdminPermission1786320000000 } from '../../../migrations/1786320000000-SeedGlossaryAdminPermission';
import { routes } from '../../routes';
import { PermissionGuard } from './permission.guard';
import { permissionGuardFor, requestTo } from './permission-guard.spec-helper';

/**
 * The glossary admin surface is guarded by one permission string and a
 * SUBSTRING match, pinned here as the real guard runs it on 2026-10-29.
 * Describes today's behaviour, oddities included (`// pinned as-is`).
 */
describe('PermissionGuard with the glossary admin permission', () => {
  const ROUTE = '/api/glossary/admin';

  const ADMIN_ROUTES = [
    '/api/glossary/admin/terms',
    '/api/glossary/admin/terms/7',
    '/api/glossary/admin/terms/7/status',
    '/api/glossary/admin/terms/7/editorial-status',
    '/api/glossary/admin/terms/7/versions',
    '/api/glossary/admin/terms/7/merge',
    '/api/glossary/admin/terms/7/group',
    '/api/glossary/admin/bulk/preview',
    '/api/glossary/admin/bulk/import',
  ];
  const PUBLIC_ROUTES = [
    '/api/glossary',
    '/api/glossary/dashboard',
    '/api/glossary/export',
    '/api/glossary/get/7',
    '/api/glossary/update',
  ];

  beforeEach(() => {
    // The guard logs every refusal; the tests assert the refusal itself.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  const allowed = (permissions: string[], url: string) =>
    permissionGuardFor(permissions).canActivate(requestTo(url));

  describe('where the string comes from', () => {
    it('is composed by the router: api + glossary + admin', () => {
      const apiPath = routes.find((r) => r.path === 'api')?.path;
      const glossaryPath = apiRoutes.find(
        (r) => r.module === GlossaryModule,
      )?.path;
      const adminPath = Reflect.getMetadata('path', GlossaryAdminController);
      expect(`/${apiPath}/${glossaryPath}/${adminPath}`).toBe(ROUTE);
    });

    it('is exactly the ROUTE the seed migration registers', () => {
      expect((SeedGlossaryAdminPermission1786320000000 as any).ROUTE).toBe(
        ROUTE,
      );
    });

    it('is written in the migration file as the literal /api/glossary/admin', () => {
      const file = readFileSync(
        join(
          __dirname,
          '../../../migrations/1786320000000-SeedGlossaryAdminPermission.ts',
        ),
        'utf8',
      );
      expect(file).toContain(
        "private static readonly ROUTE = '/api/glossary/admin';",
      );
      // The grant is copied from the permission to create institutions in bulk.
      expect(file).toContain(
        "private static readonly TEMPLATE_ROUTE = '/api/institutions/create-bulk';",
      );
      // The permission row is inserted by name, once.
      expect(file).toContain(
        'INSERT INTO permissions (name, is_active, created_by)',
      );
    });

    it('is not written anywhere else in the migration as a shorter /api/glossary', () => {
      const file = readFileSync(
        join(
          __dirname,
          '../../../migrations/1786320000000-SeedGlossaryAdminPermission.ts',
        ),
        'utf8',
      );
      const code = file.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(code.match(/\/api\/glossary(?!\/admin)/g)).toBeNull();
    });
  });

  describe('a holder of /api/glossary/admin', () => {
    it.each(ADMIN_ROUTES)('may open %s', async (url) => {
      await expect(allowed([ROUTE], url)).resolves.toBe(true);
    });

    it.each(PUBLIC_ROUTES)(
      'is not given %s by that permission',
      async (url) => {
        await expect(allowed([ROUTE], url)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
      },
    );

    it('may open the admin routes with a query string, the path is what counts', async () => {
      await expect(
        allowed([ROUTE], '/api/glossary/admin/terms?show=inactive&version=2'),
      ).resolves.toBe(true);
    });

    it('cannot borrow the permission through a query string on another route', async () => {
      await expect(
        allowed([ROUTE], '/api/countries?x=/api/glossary/admin'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is refused on a URL that only ends the permission in the query string', async () => {
      await expect(
        allowed([ROUTE], '/api/glossary?next=/api/glossary/admin'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('may open the same path with a trailing slash', async () => {
      await expect(allowed([ROUTE], '/api/glossary/admin/')).resolves.toBe(
        true,
      );
    });
  });

  describe('the substring match (as it is today)', () => {
    it('opens the admin with the shorter /api/glossary', async () => {
      // pinned as-is: `route.includes(p)`. A user who only holds /api/glossary
      // reaches every admin route, which is why the seed registers the full
      // admin prefix and never the shorter one.
      for (const url of ADMIN_ROUTES) {
        await expect(allowed(['/api/glossary'], url)).resolves.toBe(true);
      }
    });

    it('opens the public update route with the shorter /api/glossary too', async () => {
      await expect(
        allowed(['/api/glossary'], '/api/glossary/update'),
      ).resolves.toBe(true);
    });

    it('opens a route that merely CONTAINS the permission, not only one that starts with it', async () => {
      // pinned as-is.
      await expect(
        allowed([ROUTE], '/prefix/api/glossary/admin/terms'),
      ).resolves.toBe(true);
    });

    it('opens a sibling path that shares the prefix (/api/glossary/administrator)', async () => {
      // pinned as-is: no segment boundary is checked.
      await expect(
        allowed([ROUTE], '/api/glossary/administrator'),
      ).resolves.toBe(true);
    });

    it('opens every route for a permission that is the empty string', async () => {
      // pinned as-is: ''.includes('') style, `route.includes('')` is always true.
      await expect(allowed([''], '/api/glossary/admin/terms')).resolves.toBe(
        true,
      );
      await expect(allowed([''], '/anything')).resolves.toBe(true);
    });

    it('is case-sensitive', async () => {
      await expect(
        allowed([ROUTE], '/api/Glossary/Admin/terms'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        allowed(['/API/GLOSSARY/ADMIN'], '/api/glossary/admin/terms'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('any one matching permission of several is enough', async () => {
      await expect(
        allowed(
          ['/api/countries', '/api/glossary/admin'],
          '/api/glossary/admin/terms',
        ),
      ).resolves.toBe(true);
    });

    it('a user with other permissions only is refused', async () => {
      await expect(
        allowed(
          ['/api/countries', '/api/institutions'],
          '/api/glossary/admin/terms',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('a user with the Concepts admin permission is refused the glossary admin', async () => {
      await expect(
        allowed(['/api/concepts/admin'], '/api/glossary/admin/terms'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('refusals', () => {
    it('says which route was refused, path only, no query string', async () => {
      await expect(
        allowed([], '/api/glossary/admin/terms?show=all'),
      ).rejects.toThrow(
        'User is not permitted to access route /api/glossary/admin/terms',
      );
    });

    it('a user with no permissions list (null) is refused, not a crash', async () => {
      const users = {
        findOneByEmail: jest.fn(async () => ({
          id: 9,
          email: 'x@y.z',
          permissions: null,
        })),
      };
      const guard = new PermissionGuard(
        { get: () => undefined } as unknown as Reflector,
        { get: () => users } as unknown as ModuleRef,
      );
      await expect(
        guard.canActivate(requestTo('/api/glossary/admin/terms')),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('a request with no authenticated email is Unauthorized, before any permission is read', async () => {
      const guard = permissionGuardFor([ROUTE]);
      const ctx = {
        getClass: () => class {},
        switchToHttp: () => ({
          getRequest: () => ({
            user: {},
            originalUrl: '/api/glossary/admin/terms',
          }),
        }),
      } as unknown as ExecutionContext;
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        new UnauthorizedException('Missing authenticated user'),
      );
    });

    it('a request with no user at all is Unauthorized the same way', async () => {
      const guard = permissionGuardFor([ROUTE]);
      const ctx = {
        getClass: () => class {},
        switchToHttp: () => ({
          getRequest: () => ({ originalUrl: '/api/glossary/admin/terms' }),
        }),
      } as unknown as ExecutionContext;
      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('an email that is not in the database is Unauthorized, not Forbidden', async () => {
      const users = { findOneByEmail: jest.fn(async () => null) };
      const guard = new PermissionGuard(
        { get: () => undefined } as unknown as Reflector,
        { get: () => users } as unknown as ModuleRef,
      );
      await expect(
        guard.canActivate(requestTo('/api/glossary/admin/terms')),
      ).rejects.toThrow('Authenticated user was not found');
    });

    it('looks the user up by the email of the token', async () => {
      const users = {
        findOneByEmail: jest.fn(async () => ({
          id: 9,
          email: 'a@b.c',
          permissions: [ROUTE],
        })),
      };
      const guard = new PermissionGuard(
        { get: () => undefined } as unknown as Reflector,
        { get: () => users } as unknown as ModuleRef,
      );
      await guard.canActivate(requestTo('/api/glossary/admin/terms', 'a@b.c'));
      expect(users.findOneByEmail).toHaveBeenCalledWith('a@b.c');
    });
  });

  describe('the controller is guarded by this guard', () => {
    it('is the second guard of the admin controller, after JWT', () => {
      const guards = Reflect.getMetadata('__guards__', GlossaryAdminController);
      expect(guards.map((g: any) => g.name)).toEqual([
        'JwtAuthGuard',
        'PermissionGuard',
      ]);
    });
  });
});
