import { QueryRunner } from 'typeorm';
import { AddRolesUsersAdmin1790600000000 } from '../../../migrations/1790600000000-AddRolesUsersAdmin';

/** Records the SQL; `information_schema` answers from `existing`. */
const runner = (existing: Set<string>) => {
  const calls: Array<[string, unknown[]]> = [];
  const qr = {
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      calls.push([sql.replace(/\s+/g, ' ').trim(), params]);
      if (/information_schema\.COLUMNS/.test(sql)) {
        return [{ n: existing.has(`${params[0]}.${params[1]}`) ? 1 : 0 }];
      }
      return [];
    }),
  } as unknown as QueryRunner;
  return {
    qr,
    calls,
    ddl: () => calls.filter(([s]) => /^ALTER TABLE/.test(s)).map(([s]) => s),
  };
};

const ALL = new Set([
  'permissions.module',
  'permissions.label',
  'permissions.description',
  'roles.is_system',
  'roles.level',
]);

describe('AddRolesUsersAdmin1790600000000', () => {
  const migration = new AddRolesUsersAdmin1790600000000();

  it('adds the five columns on a fresh schema', async () => {
    const { qr, ddl } = runner(new Set());
    await migration.up(qr);
    expect(ddl()).toEqual([
      'ALTER TABLE `permissions` ADD COLUMN `module` varchar(50) NULL',
      'ALTER TABLE `permissions` ADD COLUMN `label` varchar(255) NULL',
      'ALTER TABLE `permissions` ADD COLUMN `description` text NULL',
      'ALTER TABLE `roles` ADD COLUMN `is_system` tinyint NOT NULL DEFAULT 0',
      "ALTER TABLE `roles` ADD COLUMN `level` varchar(20) NOT NULL DEFAULT 'module'",
    ]);
  });

  it('a second run issues no DDL (DDL auto-commits in MySQL)', async () => {
    const { qr, ddl } = runner(ALL);
    await migration.up(qr);
    expect(ddl()).toEqual([]);
  });

  it('never deletes, and only inserts behind NOT EXISTS', async () => {
    const { qr, calls } = runner(new Set());
    await migration.up(qr);
    expect(calls.some(([s]) => /^DELETE/i.test(s))).toBe(false);
    const inserts = calls.filter(([s]) => /^INSERT/i.test(s));
    expect(inserts).toHaveLength(2);
    inserts.forEach(([s]) => expect(s).toMatch(/NOT EXISTS/));
  });

  it('grants /api/access-admin to SA only', async () => {
    const { qr, calls } = runner(new Set());
    await migration.up(qr);
    const grant = calls.find(([s]) => /INSERT INTO role_permission/.test(s));
    expect(grant[0]).toMatch(/r\.acronym = 'SA'/);
    expect(grant[1]).toContain('/api/access-admin');
  });

  it('classifies the roles of the design', async () => {
    const { qr, calls } = runner(new Set());
    await migration.up(qr);
    const system = calls.find(([s]) => /SET is_system = 1/.test(s));
    expect(system[1]).toEqual([['SA', 'MS', 'CRON_EXEC', 'RQAT', 'OU']]);
    expect(
      calls.some(([s]) => /SET level = 'super'.*acronym = 'SA'/.test(s)),
    ).toBe(true);
    expect(
      calls.some(([s]) => /SET level = 'user_admin'.*acronym = 'UM'/.test(s)),
    ).toBe(true);
  });

  it('never overwrites a label edited by hand', async () => {
    const { qr, calls } = runner(new Set());
    await migration.up(qr);
    const labels = calls.filter(([s]) =>
      /^UPDATE permissions SET module/.test(s),
    );
    expect(labels.length).toBeGreaterThan(30);
    labels.forEach(([s]) => expect(s).toMatch(/COALESCE\(label, \?\)/));
    expect(labels.map(([, p]) => p[3])).toEqual(
      expect.arrayContaining([
        '/api/access-admin',
        '/api/meliaf-taxonomy/admin',
        '/api/partner-requests/create',
        '/api/users',
      ]),
    );
  });

  it('down removes the grant, the row and only existing columns', async () => {
    const { qr, calls, ddl } = runner(
      new Set(['roles.level', 'permissions.module']),
    );
    await migration.down(qr);
    expect(calls[0][0]).toMatch(/^DELETE rp FROM role_permission/);
    expect(calls[1][0]).toMatch(/^DELETE FROM permissions WHERE name = \?/);
    expect(ddl()).toEqual([
      'ALTER TABLE `roles` DROP COLUMN `level`',
      'ALTER TABLE `permissions` DROP COLUMN `module`',
    ]);
  });
});
