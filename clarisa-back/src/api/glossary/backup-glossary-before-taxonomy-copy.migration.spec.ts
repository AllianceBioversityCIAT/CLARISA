import { BackupGlossaryBeforeTaxonomyCopy1793404700000 as Migration } from '../../../migrations/1793404700000-BackupGlossaryBeforeTaxonomyCopy';

const run = async (dir: 'up' | 'down', counts: Record<string, number> = {}) => {
  const query = jest.fn(async (sql: string) => {
    const m = /SELECT COUNT\(\*\) AS n FROM `(\w+)`/.exec(sql);
    return m ? [{ n: counts[m[1]] ?? 0 }] : undefined;
  });
  await new Migration()[dir]({ query } as any);
  return query.mock.calls.map(([sql]) => String(sql).replace(/\s+/g, ' '));
};

describe('BackupGlossaryBeforeTaxonomyCopy1793404700000', () => {
  it('copies glossary and glossary_portfolios into _bak_20261030 tables with the same structure and rows', async () => {
    expect(await run('up')).toEqual([
      'CREATE TABLE IF NOT EXISTS `glossary_bak_20261030` LIKE `glossary`',
      'SELECT COUNT(*) AS n FROM `glossary_bak_20261030`',
      'INSERT INTO `glossary_bak_20261030` SELECT * FROM `glossary`',
      'CREATE TABLE IF NOT EXISTS `glossary_portfolios_bak_20261030` LIKE `glossary_portfolios`',
      'SELECT COUNT(*) AS n FROM `glossary_portfolios_bak_20261030`',
      'INSERT INTO `glossary_portfolios_bak_20261030` SELECT * FROM `glossary_portfolios`',
    ]);
  });

  it('never refills a backup that already has rows (second run keeps the original copy)', async () => {
    const calls = await run('up', { glossary_bak_20261030: 323 });
    expect(calls.filter((s) => s.startsWith('INSERT'))).toEqual([
      'INSERT INTO `glossary_portfolios_bak_20261030` SELECT * FROM `glossary_portfolios`',
    ]);
  });

  it('runs before the taxonomy copy and its rollback drops nothing', async () => {
    expect(1793404700000).toBeLessThan(1793404800000);
    expect(await run('down')).toEqual([]);
  });
});
