import { instanceToPlain } from 'class-transformer';
import { getMetadataArgsStorage } from 'typeorm';
import { DBAuth } from '../../auth/utils/DBAuth';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

/**
 * Until 2026-09-30 the public GET /api/users routes returned the password
 * hash of every user. These tests pin the fix: the hash is never loaded by
 * default, never serialised, never written through PATCH /api/users/update,
 * and only DB login reads it.
 */
describe('users.password exposure', () => {
  it('the password column is not selected by default', () => {
    const column = getMetadataArgsStorage().columns.find(
      (c) => c.target === User && c.propertyName === 'password',
    );
    expect(column?.options.select).toBe(false);
  });

  it('a user never serialises its password', () => {
    const user = Object.assign(new User(), {
      id: 1,
      email: 'a@b.org',
      password: '$2a$10$hash',
    });
    expect(instanceToPlain(user)).not.toHaveProperty('password');
  });

  const service = (repo: Record<string, unknown>) =>
    new UserService(repo as any);

  it('PATCH update never writes a password', async () => {
    const save = jest.fn(async (rows) => rows);
    await service({ save }).update([
      { id: 1, first_name: 'Ana', password: 'plain-text' } as any,
    ]);
    expect(save).toHaveBeenCalledWith([{ id: 1, first_name: 'Ana' }]);
  });

  it('findOneByUsername strips the password by default', async () => {
    const user = Object.assign(new User(), { id: 1, password: 'h' });
    const svc = service({ findOneBy: jest.fn(async () => user) });
    jest.spyOn(svc, 'getUserPermissions').mockResolvedValue([]);
    const found = await svc.findOneByUsername('ana');
    expect(found).not.toHaveProperty('password');
  });

  it('only the login read asks for the password explicitly', async () => {
    const qb = {
      addSelect: jest.fn(() => qb),
      where: jest.fn(() => qb),
      getOne: jest.fn(async () => null),
    };
    const svc = service({ createQueryBuilder: jest.fn(() => qb) });
    await svc.findOneByEmailWithPassword('a@b.org');
    expect(qb.addSelect).toHaveBeenCalledWith('user.password');
    expect(qb.where).toHaveBeenCalledWith('user.email = :email', {
      email: 'a@b.org',
    });
  });

  describe('DB login', () => {
    const auth = (user: unknown) => {
      const dbAuth = new DBAuth({ get: jest.fn() } as any);
      (dbAuth as any).usersService = {
        findOneByEmailWithPassword: jest.fn(async () => user),
        findOneByEmail: jest.fn(),
      };
      return dbAuth;
    };

    it('reads the hash through findOneByEmailWithPassword', async () => {
      const dbAuth = auth(null);
      await dbAuth.authenticate('a@b.org', 'x');
      const users = (dbAuth as any).usersService;
      expect(users.findOneByEmailWithPassword).toHaveBeenCalledWith('a@b.org');
      expect(users.findOneByEmail).not.toHaveBeenCalled();
    });

    it('refuses cleanly (no crash) when there is no stored hash', async () => {
      const out = await auth({ id: 1, password: null }).authenticate(
        'a@b.org',
        'x',
      );
      expect(out).not.toBe(true);
    });
  });
});
