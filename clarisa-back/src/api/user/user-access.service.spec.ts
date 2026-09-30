import { UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserService } from './user.service';
import { UserAccessService } from './user-access.service';

describe('UserAccessService', () => {
  const build = (user: any, roles: any[]) => {
    const userService = {
      findOneByEmail: jest.fn().mockResolvedValue(user),
    } as unknown as UserService;
    const dataSource = {
      query: jest.fn().mockResolvedValue(roles),
    } as unknown as DataSource;
    return {
      service: new UserAccessService(userService, dataSource),
      userService,
      dataSource,
    };
  };

  it('answers roles, the guard permissions and isSuper', async () => {
    const { service, userService, dataSource } = build(
      {
        id: '12',
        email: 'super@local.test',
        permissions: ['/api/access-admin', '/api/users', '/api/users'],
      },
      [
        { id: '1', acronym: 'SA', description: 'SuperAdmin', level: 'super' },
        {
          id: 9,
          acronym: 'MDA',
          description: 'Concepts Data Admins',
          level: null,
        },
      ],
    );
    await expect(service.getAccess('super@local.test')).resolves.toEqual({
      userId: 12,
      email: 'super@local.test',
      roles: [
        { id: 1, acronym: 'SA', description: 'SuperAdmin', level: 'super' },
        {
          id: 9,
          acronym: 'MDA',
          description: 'Concepts Data Admins',
          level: 'module',
        },
      ],
      permissions: ['/api/access-admin', '/api/users'],
      isSuper: true,
    });
    // Same source PermissionGuard uses.
    expect(userService.findOneByEmail).toHaveBeenCalledWith('super@local.test');
    // Only active memberships of active roles.
    const sql: string = (dataSource.query as jest.Mock).mock.calls[0][0];
    expect(sql).toMatch(/ur\.is_active = 1/);
    expect(sql).toMatch(/r\.is_active = 1/);
  });

  it('a user without roles gets empty lists, not undefined', async () => {
    const { service } = build(
      { id: 3, email: 'x@local.test', permissions: undefined },
      [],
    );
    await expect(service.getAccess('x@local.test')).resolves.toEqual({
      userId: 3,
      email: 'x@local.test',
      roles: [],
      permissions: [],
      isSuper: false,
    });
  });

  it('a module role alone is not super', async () => {
    const { service } = build(
      { id: 3, email: 'x@local.test', permissions: [] },
      [
        {
          id: 2,
          acronym: 'UM',
          description: 'User Manager',
          level: 'user_admin',
        },
      ],
    );
    await expect(service.getAccess('x@local.test')).resolves.toMatchObject({
      isSuper: false,
    });
  });

  it('401 when the token names nobody', async () => {
    const { service } = build(null, []);
    await expect(service.getAccess('ghost@local.test')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.getAccess(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
