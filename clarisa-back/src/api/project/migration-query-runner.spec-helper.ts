/** Fake QueryRunner for migration specs: SELECTs answer in order. */
export const fakeQueryRunner = (responses: unknown[][]) => ({
  query: jest.fn(async (sql: string, _params?: unknown[]) =>
    /^\s*SELECT/.test(sql) ? (responses.shift() ?? []) : undefined,
  ),
});

/** The UPDATE project calls a fake runner received, as [sql, params]. */
export const projectUpdates = (query: jest.Mock) =>
  query.mock.calls.filter(([sql]) => /UPDATE project/.test(String(sql)));
