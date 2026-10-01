import { ConceptsSchemeCodeMeliafTaxonomy1790600600000 } from '../../../migrations/1790600600000-ConceptsSchemeCodeMeliafTaxonomy';

describe('ConceptsSchemeCodeMeliafTaxonomy1790600600000', () => {
  const run = async (dir: 'up' | 'down', taken = false) => {
    const query = jest.fn(async (sql: string, _params?: unknown[]) =>
      /^\s*SELECT 1 FROM gc_schemes/.test(sql)
        ? taken
          ? [{ 1: 1 }]
          : []
        : undefined,
    );
    await new ConceptsSchemeCodeMeliafTaxonomy1790600600000()[dir]({
      query,
    } as any);
    return query.mock.calls.map(([sql, params]) => [
      String(sql),
      (params ?? []) as unknown[],
    ]) as [string, unknown[]][];
  };
  const find = (calls: [string, unknown[]][], re: RegExp) =>
    calls.filter(([sql]) => re.test(sql));

  it('renames the scheme code and its list scope, and sets the title', async () => {
    const calls = await run('up');
    expect(find(calls, /UPDATE gc_schemes SET code/)[0][1]).toEqual([
      'meliaf-taxonomy',
      'concepts',
    ]);
    expect(find(calls, /UPDATE gc_lists SET scope/)[0][1]).toEqual([
      'meliaf-taxonomy',
      'concepts',
    ]);
    expect(find(calls, /SET title/)[0][1]).toEqual([
      'MELIAF taxonomy',
      'meliaf-taxonomy',
    ]);
  });

  it('does not rename when meliaf-taxonomy already exists (second run)', async () => {
    const calls = await run('up', true);
    expect(find(calls, /UPDATE gc_schemes SET code/)).toEqual([]);
  });

  it('moves the permission routes of the admin', async () => {
    const calls = await run('up');
    expect(find(calls, /UPDATE permissions/)[0][1]).toEqual([
      '/admin/concepts/',
      '/admin/meliaf-taxonomy/',
      '/admin/concepts/',
    ]);
    expect(ConceptsSchemeCodeMeliafTaxonomy1790600600000.CONCEPTS_ROUTE).toBe(
      '/api/concepts/admin/meliaf-taxonomy/concepts',
    );
  });

  it('rewrites stored URIs with the pattern, never the API paths', async () => {
    const calls = await run('up');
    const [, params] = find(calls, /REGEXP_REPLACE\(release_uri/)[0];
    const re = new RegExp(String(params[0]), 'g');
    const to = String(params[1]);
    const swap = (t: string) => t.replace(re, to);
    expect(swap('https://api.clarisa.cgiar.org/concepts/2374')).toBe(
      'https://api.clarisa.cgiar.org/concepts/meliaf-taxonomy/2374',
    );
    expect(swap('https://api.clarisa.cgiar.org/concepts/releases/1.0.0')).toBe(
      'https://api.clarisa.cgiar.org/concepts/meliaf-taxonomy/releases/1.0.0',
    );
    expect(
      swap('https://api.clarisa.cgiar.org/api/concepts/concepts/concepts/2374'),
    ).toBe('https://api.clarisa.cgiar.org/api/concepts/concepts/concepts/2374');
    expect(
      swap('https://api.clarisa.cgiar.org/concepts/meliaf-taxonomy/2374'),
    ).toBe('https://api.clarisa.cgiar.org/concepts/meliaf-taxonomy/2374');
    // History, proposals, releases and outbox: URIs and the scheme code.
    expect(find(calls, /REGEXP_REPLACE\(`/).length).toBe(4);
    expect(find(calls, /"scheme":"concepts"/).length).toBe(4);
  });

  it('down goes back to concepts', async () => {
    const calls = await run('down');
    expect(find(calls, /UPDATE gc_schemes SET code/)[0][1]).toEqual([
      'concepts',
      'meliaf-taxonomy',
    ]);
    expect(find(calls, /UPDATE permissions/)[0][1]).toEqual([
      '/admin/meliaf-taxonomy',
      '/admin/concepts',
      '/admin/meliaf-taxonomy',
    ]);
  });
});
