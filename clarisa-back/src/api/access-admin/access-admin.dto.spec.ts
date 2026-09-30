import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ACCESS_ADMIN_VALIDATION_PIPE } from './access-admin.controller';
import {
  AddRoleMembersDto,
  CreateRoleDto,
  ListUsersQueryDto,
  RemoveRoleMemberDto,
  SetRolePermissionsDto,
  UpdateRoleDto,
} from './dto/access-admin.dto';

/**
 * The payload contract of `api/access-admin`, run through the SAME pipe
 * instance the controller declares (there is no global pipe), with the
 * metadata Nest passes for `@Body()` / `@Query()`.
 */
describe('Access admin DTO validation', () => {
  const run = (
    metatype: unknown,
    value: unknown,
    type: ArgumentMetadata['type'] = 'body',
  ) =>
    ACCESS_ADMIN_VALIDATION_PIPE.transform(value, {
      type,
      metatype: metatype as ArgumentMetadata['metatype'],
      data: '',
    });

  describe('CreateRoleDto', () => {
    it('accepts the roles screen payload and trims it', async () => {
      await expect(
        run(CreateRoleDto, {
          acronym: ' CONCEPTS_DA ',
          description: '  Concepts Data Admins ',
          permissionIds: [7],
        }),
      ).resolves.toMatchObject({
        acronym: 'CONCEPTS_DA',
        description: 'Concepts Data Admins',
        permissionIds: [7],
      });
    });

    it('accepts a role with no permission yet', async () => {
      await expect(
        run(CreateRoleDto, {
          acronym: 'AB',
          description: 'Empty role',
          permissionIds: [],
        }),
      ).resolves.toMatchObject({ permissionIds: [] });
    });

    it.each([
      ['acronym with spaces', { acronym: 'CONCEPTS DA' }],
      ['one-letter acronym', { acronym: 'M' }],
      ['short description', { description: 'ab' }],
      ['duplicated permission ids', { permissionIds: [1, 1] }],
      ['non-numeric permission id', { permissionIds: ['x'] }],
      ['missing permissionIds', { permissionIds: undefined }],
      ['unknown key', { isSystem: true }],
      ['unknown key level', { level: 'super' }],
    ])('rejects %s', async (_case, override) => {
      await expect(
        run(CreateRoleDto, {
          acronym: 'MDA',
          description: 'Concepts Data Admins',
          permissionIds: [1],
          ...override,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('UpdateRoleDto', () => {
    it('accepts a partial update', async () => {
      await expect(
        run(UpdateRoleDto, { isActive: false, justification: 'Not needed' }),
      ).resolves.toMatchObject({ isActive: false });
    });

    it('rejects a string boolean in the body', async () => {
      await expect(
        run(UpdateRoleDto, { isActive: 'no' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('SetRolePermissionsDto', () => {
    it('coerces numeric strings', async () => {
      await expect(
        run(SetRolePermissionsDto, { permissionIds: ['3', 4] }),
      ).resolves.toMatchObject({ permissionIds: [3, 4] });
    });
  });

  describe('AddRoleMembersDto', () => {
    it('accepts a bulk list', async () => {
      await expect(
        run(AddRoleMembersDto, { userIds: [1, 2, 3] }),
      ).resolves.toMatchObject({ userIds: [1, 2, 3] });
    });

    it.each([
      ['an empty list', { userIds: [] }],
      ['repeated ids', { userIds: [1, 1] }],
      ['a zero id', { userIds: [0] }],
      [
        'more than 500 users',
        { userIds: Array.from({ length: 501 }, (_, i) => i + 1) },
      ],
      ['no list', {}],
    ])('rejects %s', async (_case, body) => {
      await expect(run(AddRoleMembersDto, body)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('RemoveRoleMemberDto', () => {
    it('accepts a justification', async () => {
      await expect(
        run(RemoveRoleMemberDto, {
          justification: '  Left the Concepts team ',
        }),
      ).resolves.toMatchObject({ justification: 'Left the Concepts team' });
    });

    it.each([
      ['a missing justification', {}],
      ['a blank justification', { justification: '     ' }],
      ['a too short justification', { justification: 'no' }],
    ])('rejects %s', async (_case, body) => {
      await expect(run(RemoveRoleMemberDto, body)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('ListUsersQueryDto (query string)', () => {
    it('turns the query string into typed filters', async () => {
      await expect(
        run(
          ListUsersQueryDto,
          {
            search: ' ana ',
            roleId: '4',
            withoutRole: 'true',
            page: '2',
            pageSize: '50',
          },
          'query',
        ),
      ).resolves.toMatchObject({
        search: 'ana',
        roleId: 4,
        withoutRole: true,
        page: 2,
        pageSize: 50,
      });
    });

    it('reads withoutRole=false as false', async () => {
      await expect(
        run(ListUsersQueryDto, { withoutRole: 'false' }, 'query'),
      ).resolves.toMatchObject({ withoutRole: false });
    });

    it.each([
      ['pageSize over 100', { pageSize: '101' }],
      ['page 0', { page: '0' }],
      ['unknown filter', { role: 'SA' }],
    ])('rejects %s', async (_case, query) => {
      await expect(
        run(ListUsersQueryDto, query, 'query'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
