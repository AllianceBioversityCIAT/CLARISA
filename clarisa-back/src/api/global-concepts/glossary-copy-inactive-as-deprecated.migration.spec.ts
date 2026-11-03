import { GlossaryCopyInactiveAsDeprecated1793736000000 as Migration } from '../../../migrations/1793736000000-GlossaryCopyInactiveAsDeprecated';

type Call = [string, unknown[]];

const mark = (is_active: unknown, more: Record<string, unknown> = {}) =>
  JSON.stringify({
    ...more,
    _glossary: {
      is_active,
      show_in_dashboard: false,
      group_id: 1,
      reference_date: null,
      application_name: null,
    },
  });

/** What `SELECT id, extra … status = 'approved'` returns in a dev-like base. */
const APPROVED = [
  { id: 1, extra: mark(true, { portfolios: ['3'] }) }, // active copy
  { id: 2, extra: mark(false, { portfolios: ['2'] }) }, // inactive copy
  { id: 3, extra: mark(false) }, // inactive copy
  { id: 4, extra: '{"note":"has \\"_glossary\\" in a value"}' }, // not a copy
  { id: 5, extra: '{"_glossary": "x"}' }, // mark is not an object
  { id: 6, extra: 'not json "_glossary"' },
  { id: 7, extra: null },
];

const run = async (
  dir: 'up' | 'down',
  opts: { scheme?: boolean; approved?: typeof APPROVED } = {},
) => {
  const query = jest.fn(async (sql: string, _params?: unknown[]) => {
    if (/FROM gc_schemes/.test(sql))
      return opts.scheme === false ? [] : [{ id: 7 }];
    if (/SELECT id, extra FROM gc_concepts/.test(sql))
      return opts.approved ?? APPROVED;
    return undefined;
  });
  await new Migration()[dir]({ query } as any);
  return query.mock.calls.map(([sql, params]) => [
    String(sql).replace(/\s+/g, ' ').trim(),
    (params ?? []) as unknown[],
  ]) as Call[];
};
const find = (calls: Call[], re: RegExp) =>
  calls.filter(([sql]) => re.test(sql));

describe('GlossaryCopyInactiveAsDeprecated1793736000000', () => {
  it('recognises only the copy of an inactive term', () => {
    expect(Migration.isInactiveCopy(mark(false))).toBe(true);
    expect(Migration.isInactiveCopy(mark(true))).toBe(false);
    expect(Migration.isInactiveCopy(mark(0))).toBe(false);
    expect(Migration.isInactiveCopy('{"_glossary": null}')).toBe(false);
    expect(Migration.isInactiveCopy('{"_glossary": [false]}')).toBe(false);
    expect(
      Migration.isInactiveCopy('[{"_glossary": {"is_active": false}}]'),
    ).toBe(false);
    expect(Migration.isInactiveCopy('not json')).toBe(false);
    expect(Migration.isInactiveCopy(null)).toBe(false);
  });

  it('writes nothing when the scheme does not exist', async () => {
    const calls = await run('up', { scheme: false });
    expect(calls).toHaveLength(1);
  });

  it('reads only approved concepts of the scheme that carry the copy mark', async () => {
    const calls = await run('up');
    const [select] = find(calls, /SELECT id, extra FROM gc_concepts/);
    expect(select[0]).toMatch(
      /scheme_id = \? AND status = 'approved' AND extra LIKE \?/,
    );
    expect(select[1]).toEqual([7, '%"_glossary"%']);
  });

  it('moves each approved inactive copy to deprecated with a status row in the history, nothing else', async () => {
    const calls = await run('up');
    const updates = find(calls, /^UPDATE gc_concepts/);
    expect(updates.map(([, p]) => p)).toEqual([[2], [3]]);
    expect(updates[0][0]).toBe(
      "UPDATE gc_concepts SET status = 'deprecated' WHERE id = ? AND status = 'approved'",
    );
    const history = find(calls, /INSERT INTO gc_history/);
    expect(history.map(([, p]) => p[0])).toEqual([2, 3]);
    expect(history[0][0]).toMatch(/VALUES \(\?, 'status', \?, NULL, \?\)/);
    expect(JSON.parse(String(history[0][1][1]))).toEqual({
      status: { from: 'approved', to: 'deprecated' },
    });
    expect(history[1][1][2]).toBe(history[0][1][2]);
    // Every write is one of those two statements.
    expect(calls.filter(([sql]) => !/^SELECT/.test(sql))).toHaveLength(4);
  });

  it('writes nothing when the copy already left every inactive term deprecated (prod)', async () => {
    const calls = await run('up', { approved: [APPROVED[0], APPROVED[3]] });
    expect(calls.filter(([sql]) => !/^SELECT/.test(sql))).toEqual([]);
  });

  it('down changes nothing', async () => {
    expect(await run('down')).toEqual([]);
  });
});
