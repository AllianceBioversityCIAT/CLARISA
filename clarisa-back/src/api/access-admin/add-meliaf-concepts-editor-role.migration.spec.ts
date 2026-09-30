import { QueryRunner } from 'typeorm';
import { AddMeliafConceptsEditorRole1790600100000 } from '../../../migrations/1790600100000-AddMeliafConceptsEditorRole';

/** Records the SQL the migration sends. */
const runner = () => {
  const calls: Array<[string, unknown[]]> = [];
  const qr = {
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      calls.push([sql.replace(/\s+/g, ' ').trim(), params]);
      return [];
    }),
  } as unknown as QueryRunner;
  return { qr, calls };
};

describe('AddMeliafConceptsEditorRole1790600100000', () => {
  const migration = new AddMeliafConceptsEditorRole1790600100000();
  const cls = AddMeliafConceptsEditorRole1790600100000;

  it('uses the concepts path, which the full-admin permission contains', () => {
    expect(cls.CONCEPTS_ROUTE).toBe(
      '/api/meliaf-taxonomy/admin/meliaf/concepts',
    );
    expect(cls.CONCEPTS_ROUTE.includes(cls.FULL_ROUTE)).toBe(true);
  });

  it('issues no DDL and never deletes on up (DDL auto-commits in MySQL)', async () => {
    const { qr, calls } = runner();
    await migration.up(qr);
    expect(calls.some(([s]) => /^(ALTER|CREATE|DROP)/i.test(s))).toBe(false);
    expect(calls.some(([s]) => /^DELETE/i.test(s))).toBe(false);
  });

  it('inserts permission, role and grant only behind NOT EXISTS', async () => {
    const { qr, calls } = runner();
    await migration.up(qr);
    const inserts = calls.filter(([s]) => /^INSERT/i.test(s));
    expect(inserts.map(([s]) => s.match(/^INSERT INTO (\w+)/)[1])).toEqual([
      'permissions',
      'roles',
      'role_permission',
    ]);
    inserts.forEach(([s]) => expect(s).toMatch(/NOT EXISTS/));
  });

  it('seeds the permission with its plain wording', async () => {
    const { qr, calls } = runner();
    await migration.up(qr);
    const [, params] = calls.find(([s]) => /^INSERT INTO permissions/.test(s));
    expect(params[0]).toBe('/api/meliaf-taxonomy/admin/meliaf/concepts');
    expect(params[1]).toBe('MELIAF Taxonomy');
    expect(params[2]).toBe('Manage concepts');
    expect(String(params[3]).length).toBeGreaterThan(20);
    expect(params[5]).toBe(params[0]);
  });

  it('creates MELIAF_CE as a non-system module role after the last order', async () => {
    const { qr, calls } = runner();
    await migration.up(qr);
    const [sql, params] = calls.find(([s]) => /^INSERT INTO roles/.test(s));
    expect(params).toEqual([
      'MELIAF Concepts Editor',
      'MELIAF_CE',
      3043,
      'MELIAF_CE',
    ]);
    expect(sql).toMatch(/0, 'module', 1/);
    // The aggregate lives in a derived table, so a second run inserts nothing
    // (an aggregate filtered to zero rows would still return one row).
    expect(sql).toMatch(
      /FROM \(SELECT COALESCE\(MAX\(`order`\), 0\) \+ 1 AS next_order FROM roles\) t WHERE NOT EXISTS/,
    );
  });

  it('grants the concepts permission to MELIAF_CE only', async () => {
    const { qr, calls } = runner();
    await migration.up(qr);
    const [sql, params] = calls.find(([s]) =>
      /^INSERT INTO role_permission/.test(s),
    );
    expect(sql).toMatch(/r\.acronym = \?/);
    expect(params).toEqual([3043, cls.CONCEPTS_ROUTE, 'MELIAF_CE']);
  });

  it('relabels the full-admin permission only when NULL or still the seeded label', async () => {
    const { qr, calls } = runner();
    await migration.up(qr);
    const [sql, params] = calls.find(([s]) => /^UPDATE permissions/.test(s));
    expect(sql).toMatch(/\(label IS NULL OR label = \?\)/);
    expect(params).toEqual([
      'MELIAF Taxonomy — Full administration',
      '/api/meliaf-taxonomy/admin',
      'Manage the MELIAF Taxonomy',
    ]);
  });

  it('down restores the label and removes grants, memberships, role and permission', async () => {
    const { qr, calls } = runner();
    await migration.down(qr);
    expect(calls.map(([s]) => s.slice(0, 40))).toEqual([
      expect.stringMatching(/^UPDATE permissions SET label = \?/),
      expect.stringMatching(/^DELETE rp FROM role_permission/),
      expect.stringMatching(/^DELETE rp FROM role_permission/),
      expect.stringMatching(/^DELETE ur FROM user_roles/),
      expect.stringMatching(/^DELETE FROM roles WHERE acronym = \?/),
      expect.stringMatching(/^DELETE FROM permissions WHERE name = \?/),
    ]);
    expect(calls[0][0]).toMatch(/WHERE name = \? AND label = \?/);
    expect(calls[0][1]).toEqual([
      'Manage the MELIAF Taxonomy',
      '/api/meliaf-taxonomy/admin',
      'MELIAF Taxonomy — Full administration',
    ]);
    expect(calls[4][1]).toEqual(['MELIAF_CE']);
    expect(calls[5][1]).toEqual([cls.CONCEPTS_ROUTE]);
  });

  it('exports only the migration class (TypeORM loads every export)', async () => {
    const mod = await import(
      '../../../migrations/1790600100000-AddMeliafConceptsEditorRole'
    );
    expect(Object.keys(mod)).toEqual([
      'AddMeliafConceptsEditorRole1790600100000',
    ]);
  });
});
