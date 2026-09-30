import { RenameMeliafAccessToConcepts1790600400000 } from '../../../migrations/1790600400000-RenameMeliafAccessToConcepts';

describe('RenameMeliafAccessToConcepts1790600400000', () => {
  const run = async (dir: 'up' | 'down') => {
    const query = jest.fn(async () => undefined);
    await new RenameMeliafAccessToConcepts1790600400000()[dir]({
      query,
    } as any);
    return query.mock.calls as unknown as [string, unknown[]][];
  };

  it('up moves the routes, the module, the texts still seeded and the role', async () => {
    const calls = await run('up');
    expect(calls[0][1]).toEqual([
      'api/meliaf-taxonomy',
      'api/concepts',
      'api/meliaf-taxonomy',
    ]);
    expect(calls[1][1]).toEqual(['Concepts', 'MELIAF Taxonomy']);
    const texts = calls.slice(2, 5);
    for (const [sql] of texts) expect(sql).toMatch(/IS NULL OR/);
    expect(texts[0][1]).toEqual([
      'Concepts — Full administration',
      '/api/concepts/admin',
      ['Manage the MELIAF Taxonomy', 'MELIAF Taxonomy — Full administration'],
    ]);
    const [roleSql, roleArgs] = calls[5];
    expect(roleSql).toMatch(/UPDATE roles/);
    expect(roleSql).toMatch(/NOT EXISTS/);
    expect(roleArgs).toEqual([
      'MELIAF Concepts Editor',
      'Concepts Editor',
      'CONCEPTS_CE',
      'MELIAF_CE',
      'CONCEPTS_CE',
    ]);
    expect(calls).toHaveLength(6);
  });

  it('no text in the new wording mentions MELIAF Taxonomy', async () => {
    const calls = await run('up');
    for (const [, args] of calls.slice(2, 5))
      expect(String(args[0])).not.toMatch(/MELIAF/);
  });

  it('down restores the role, the texts and the module, and leaves routes to the earlier migration', async () => {
    const calls = await run('down');
    expect(calls[0][1]).toEqual([
      'Concepts Editor',
      'MELIAF Concepts Editor',
      'MELIAF_CE',
      'CONCEPTS_CE',
      'MELIAF_CE',
    ]);
    expect(calls[1][1]).toEqual([
      'MELIAF Taxonomy — Full administration',
      '/api/concepts/admin',
      'Concepts — Full administration',
    ]);
    expect(calls[4][1]).toEqual(['MELIAF Taxonomy', 'Concepts']);
    expect(calls.some(([sql]) => /REPLACE\(name/.test(sql))).toBe(false);
  });
});
