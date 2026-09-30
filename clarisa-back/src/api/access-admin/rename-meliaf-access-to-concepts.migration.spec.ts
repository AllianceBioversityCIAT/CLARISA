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
    expect(calls[2][0]).toMatch(/module IS NULL/);
    const texts = calls.slice(3, 6);
    for (const [sql] of texts) expect(sql).toMatch(/IS NULL OR/);
    expect(texts[0][1]).toEqual([
      'Concepts — Full administration',
      '/api/concepts/admin',
      ['Manage the MELIAF Taxonomy', 'MELIAF Taxonomy — Full administration'],
    ]);
    expect(calls[6]).toEqual([
      expect.stringMatching(/SELECT 1 FROM roles/),
      ['CONCEPTS_CE'],
    ]);
    const [roleSql, roleArgs] = calls[7];
    expect(roleSql).toMatch(/UPDATE roles/);
    expect(roleSql).not.toMatch(/SELECT/);
    expect(roleArgs).toEqual([
      'MELIAF Concepts Editor',
      'Concepts Editor',
      'CONCEPTS_CE',
      'MELIAF_CE',
    ]);
    expect(calls).toHaveLength(8);
  });

  it('leaves the role alone when CONCEPTS_CE already exists', async () => {
    const query = jest.fn(async (sql: string) =>
      /SELECT 1 FROM roles/.test(sql) ? [{ 1: 1 }] : undefined,
    );
    await new RenameMeliafAccessToConcepts1790600400000().up({
      query,
    } as any);
    expect(
      query.mock.calls.some(([sql]) => /UPDATE roles/.test(String(sql))),
    ).toBe(false);
  });

  it('no text in the new wording mentions MELIAF Taxonomy', async () => {
    const calls = await run('up');
    for (const [, args] of calls.slice(3, 6))
      expect(String(args[0])).not.toMatch(/MELIAF/);
  });

  it('down restores the role, the texts and the module, and the routes', async () => {
    const calls = await run('down');
    expect(calls[1][1]).toEqual([
      'Concepts Editor',
      'MELIAF Concepts Editor',
      'MELIAF_CE',
      'CONCEPTS_CE',
    ]);
    expect(calls[2][1]).toEqual([
      'MELIAF Taxonomy — Full administration',
      '/api/concepts/admin',
      'Concepts — Full administration',
    ]);
    expect(calls[5][1]).toEqual(['MELIAF Taxonomy', 'Concepts']);
    expect(calls[6][1]).toEqual([
      'api/concepts',
      'api/meliaf-taxonomy',
      'api/concepts',
    ]);
  });
});
