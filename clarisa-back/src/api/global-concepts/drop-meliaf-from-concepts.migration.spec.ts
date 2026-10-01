import { DropMeliafFromConcepts1790600500000 } from '../../../migrations/1790600500000-DropMeliafFromConcepts';
import { CreateGlobalConcepts1790500000000 } from '../../../migrations/1790500000000-CreateGlobalConcepts';

describe('DropMeliafFromConcepts1790600500000', () => {
  /** A database where the old names still exist and nothing new is taken. */
  const fakeDb = (existing: Set<string>) =>
    jest.fn(async (sql: string, params: unknown[] = []) => {
      if (/information_schema\.COLUMNS/.test(sql))
        return [{ n: existing.has(String(params[1])) ? 1 : 0 }];
      if (/^SELECT 1/.test(sql.trim())) return [];
      return undefined;
    });

  const run = async (dir: 'up' | 'down', existing: string[]) => {
    const query = fakeDb(new Set(existing));
    await new DropMeliafFromConcepts1790600500000()[dir]({ query } as any);
    return query.mock.calls.map(([sql, params]) => [
      String(sql),
      params as unknown[],
    ]) as [string, unknown[]][];
  };

  it('renames the three columns when the old ones exist', async () => {
    const calls = await run('up', [
      'meliaf_function',
      'meliaf_phase_primary',
      'meliaf_phase_also',
    ]);
    const ddl = calls.map(([sql]) => sql).filter((s) => /ALTER TABLE/.test(s));
    expect(ddl).toEqual([
      'ALTER TABLE `gc_concepts` CHANGE `meliaf_function` `functions` text NULL',
      'ALTER TABLE `gc_concepts` CHANGE `meliaf_phase_primary` `phase_primary` varchar(50) NULL',
      'ALTER TABLE `gc_concepts` CHANGE `meliaf_phase_also` `phase_also` text NULL',
    ]);
  });

  it('runs no DDL on a second run (the new columns already exist)', async () => {
    const calls = await run('up', ['functions', 'phase_primary', 'phase_also']);
    expect(calls.some(([sql]) => /ALTER TABLE/.test(sql))).toBe(false);
  });

  it('renames lists, scheme, routes and the scheme scope of its lists', async () => {
    const calls = await run('up', []);
    const updates = calls.filter(([sql]) => /^\s*UPDATE/.test(sql));
    const has = (re: RegExp, params?: unknown[]) =>
      updates.some(
        ([sql, p]) =>
          re.test(sql) &&
          (!params || JSON.stringify(p) === JSON.stringify(params)),
      );
    expect(
      has(/UPDATE gc_lists SET list_code/, ['functions', 'meliaf_function']),
    ).toBe(true);
    expect(
      has(/UPDATE gc_lists SET list_code/, ['phase', 'meliaf_phase']),
    ).toBe(true);
    expect(has(/UPDATE gc_schemes SET code/, ['concepts', 'meliaf'])).toBe(
      true,
    );
    expect(has(/UPDATE gc_lists SET scope/, ['concepts', 'meliaf'])).toBe(true);
    expect(
      has(/UPDATE permissions/, [
        '/admin/meliaf/',
        '/admin/concepts/',
        '/admin/meliaf/',
      ]),
    ).toBe(true);
    expect(has(/release_uri/)).toBe(true);
  });

  it('keeps the last-edit date of concepts it rewrites', async () => {
    const calls = await run('up', []);
    const steward = calls.find(([sql]) =>
      /UPDATE `gc_concepts` SET `steward`/.test(sql),
    );
    expect(steward?.[0]).toMatch(/updated_at = updated_at/);
  });

  it('maps the seeded lists to the codes a database holds today', () => {
    const lists = DropMeliafFromConcepts1790600500000.currentLists(
      CreateGlobalConcepts1790500000000.LISTS,
    );
    expect(Object.keys(lists)).toEqual(
      expect.arrayContaining(['functions', 'phase', 'status']),
    );
    expect(Object.keys(lists).some((k) => /meliaf/.test(k))).toBe(false);
  });

  it('down restores the columns and the scheme code', async () => {
    const calls = await run('down', [
      'functions',
      'phase_primary',
      'phase_also',
    ]);
    const sql = calls.map(([s]) => s).join('\n');
    expect(sql).toMatch(/CHANGE `functions` `meliaf_function`/);
    expect(
      calls.some(
        ([s, p]) =>
          /UPDATE gc_schemes SET code/.test(s) &&
          JSON.stringify(p) === JSON.stringify(['meliaf', 'concepts']),
      ),
    ).toBe(true);
  });
});
