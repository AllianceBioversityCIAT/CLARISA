import {
  GUARDS_METADATA,
  PATH_METADATA,
  METHOD_METADATA,
} from '@nestjs/common/constants';
import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { apiRoutes } from '../api.routes';
import { UserAccessController } from '../user/user-access.controller';
import { UserService } from '../user/user.service';
import { AccessAdminController } from './access-admin.controller';
import { AccessAdminModule } from './access-admin.module';
import { AccessAdminService } from './access-admin.service';

const route = (target: object, method: string) => ({
  path: Reflect.getMetadata(PATH_METADATA, target[method]),
  verb: Reflect.getMetadata(METHOD_METADATA, target[method]),
});

describe('AccessAdminController wiring', () => {
  const proto = AccessAdminController.prototype;

  it('is mounted at api/access-admin', () => {
    expect(apiRoutes).toContainEqual({
      path: 'access-admin',
      module: AccessAdminModule,
    });
  });

  it('guards every route with JwtAuthGuard + PermissionGuard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AccessAdminController)).toEqual(
      [JwtAuthGuard, PermissionGuard],
    );
  });

  it.each([
    ['listUsers', 'users', RequestMethod.GET],
    ['listRoles', 'roles', RequestMethod.GET],
    ['createRole', 'roles', RequestMethod.POST],
    ['updateRole', 'roles/:id', RequestMethod.PATCH],
    ['setRolePermissions', 'roles/:id/permissions', RequestMethod.PUT],
    ['listMembers', 'roles/:id/members', RequestMethod.GET],
    ['addMembers', 'roles/:id/members', RequestMethod.POST],
    ['removeMember', 'roles/:id/members/:userId', RequestMethod.DELETE],
    ['listPermissions', 'permissions', RequestMethod.GET],
  ])('%s → %s', (method, path, verb) => {
    expect(route(proto, method)).toEqual({ path, verb });
  });

  it('delegates to the service with the caller', async () => {
    const service = {
      addMembers: jest
        .fn()
        .mockResolvedValue({ added: [1], alreadyMembers: [] }),
      removeMember: jest.fn().mockResolvedValue({ removed: true }),
    } as unknown as AccessAdminService;
    const controller = new AccessAdminController(service);
    const user = { userId: 1, email: 'a@b.c', permissions: '' };
    await controller.addMembers(4, { userIds: [1] }, user);
    await controller.removeMember(4, 9, { justification: 'moved' }, user);
    expect(service.addMembers).toHaveBeenCalledWith(4, { userIds: [1] }, user);
    expect(service.removeMember).toHaveBeenCalledWith(
      4,
      9,
      { justification: 'moved' },
      user,
    );
  });
});

describe('GET api/users/me/access wiring', () => {
  it('only needs a signed-in user (no PermissionGuard)', () => {
    const handler = UserAccessController.prototype.getMyAccess;
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      JwtAuthGuard,
    ]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, UserAccessController),
    ).toBeUndefined();
    expect(route(UserAccessController.prototype, 'getMyAccess')).toEqual({
      path: 'me/access',
      verb: RequestMethod.GET,
    });
  });
});

/** The real PermissionGuard, fed with the permission the migration seeds. */
describe('PermissionGuard on api/access-admin', () => {
  const guardFor = (permissions: string[] | undefined) => {
    const userService = {
      findOneByEmail: jest
        .fn()
        .mockResolvedValue({ id: 5, email: 'a@b.c', permissions }),
    } as unknown as UserService;
    const moduleRef = { get: () => userService } as any;
    return new PermissionGuard(new Reflector(), moduleRef);
  };
  const ctx = (url: string) =>
    ({
      getClass: () => AccessAdminController,
      switchToHttp: () => ({
        getRequest: () => ({ originalUrl: url, user: { email: 'a@b.c' } }),
      }),
    }) as any;

  it('lets a holder of /api/access-admin in', async () => {
    await expect(
      guardFor(['/api/access-admin']).canActivate(
        ctx('/api/access-admin/roles/4/members'),
      ),
    ).resolves.toBe(true);
  });

  it.each([[['/api/users']], [['/api/meliaf-taxonomy/admin']], [undefined]])(
    'keeps %p out',
    async (permissions) => {
      await expect(
        guardFor(permissions).canActivate(ctx('/api/access-admin/users')),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );
});
