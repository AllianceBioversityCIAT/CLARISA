import { MeliafTaxonomyApiPrefix1790600700000 } from '../../../migrations/1790600700000-MeliafTaxonomyApiPrefix';

describe('MeliafTaxonomyApiPrefix1790600700000', () => {
  const run = async (dir: 'up' | 'down') => {
    const query = jest.fn(
      async (_sql: string, _params?: unknown[]) => undefined,
    );
    await new MeliafTaxonomyApiPrefix1790600700000()[dir]({ query } as any);
    return query.mock.calls.map(([sql, params]) => [
      String(sql),
      params ?? [],
    ]) as [string, unknown[]][];
  };
  /** What a REPLACE with these params does to a permission name it matches. */
  const apply = (name: string, [from, to]: unknown[]) =>
    name.startsWith(String(from))
      ? name.replace(String(from), String(to))
      : name;

  it('moves both permission routes, the concepts-only one first', async () => {
    const routes = (await run('up'))
      .filter(([sql]) => /UPDATE permissions/.test(sql))
      .map(([, p]) => p);
    let editor = '/api/concepts/admin/meliaf-taxonomy/concepts';
    let full = '/api/concepts/admin';
    for (const params of routes) {
      editor = apply(editor, params);
      full = apply(full, params);
    }
    expect(editor).toBe(MeliafTaxonomyApiPrefix1790600700000.CONCEPTS_ROUTE);
    expect(full).toBe(MeliafTaxonomyApiPrefix1790600700000.FULL_ROUTE);
  });

  it('down gives the old routes back', async () => {
    const routes = (await run('down'))
      .filter(([sql]) => /UPDATE permissions/.test(sql))
      .map(([, p]) => p);
    let editor = MeliafTaxonomyApiPrefix1790600700000.CONCEPTS_ROUTE;
    let full = MeliafTaxonomyApiPrefix1790600700000.FULL_ROUTE;
    for (const params of routes) {
      editor = apply(editor, params);
      full = apply(full, params);
    }
    expect(editor).toBe('/api/concepts/admin/meliaf-taxonomy/concepts');
    expect(full).toBe('/api/concepts/admin');
  });

  it('drops /concepts from stored URIs: releases and the four JSON columns', async () => {
    const calls = await run('up');
    const uris = calls.filter(
      ([sql]) => /REPLACE\(/.test(sql) && !/permissions/.test(sql),
    );
    expect(uris).toHaveLength(5);
    for (const [, params] of uris)
      expect(params.slice(0, 2)).toEqual([
        '/concepts/meliaf-taxonomy/',
        '/meliaf-taxonomy/',
      ]);
  });
});
