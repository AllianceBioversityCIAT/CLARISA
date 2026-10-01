import { LabelTechnicalPermissions1790600200000 as Migration } from '../../../migrations/1790600200000-LabelTechnicalPermissions';

describe('LabelTechnicalPermissions1790600200000', () => {
  const runner = () => ({ query: jest.fn(async () => undefined) });

  it('labels the 14 technical permissions without DDL and only while unlabelled', async () => {
    const qr = runner();
    await new Migration().up(qr as any);
    expect(qr.query).toHaveBeenCalledTimes(14);
    for (const [sql] of qr.query.mock.calls as unknown as [string][]) {
      expect(sql).toMatch(/^UPDATE `permissions` SET/);
      expect(sql).toMatch(/`label` IS NULL$/);
      expect(sql).not.toMatch(/ALTER|DROP|DELETE|INSERT/i);
    }
  });

  it('down clears only the labels it wrote', async () => {
    const qr = runner();
    await new Migration().down(qr as any);
    const [sql, params] = (
      qr.query.mock.calls as unknown as [string, string[]][]
    )[0];
    expect(sql).toMatch(
      /WHERE `name` = \? AND `module` = \? AND `label` = \?$/,
    );
    expect(params).toEqual([
      '/api/users/update',
      'Access',
      'Edit user records',
    ]);
  });

  it('covers every route that had no label in clarisatest', () => {
    expect(Migration.LABELS.map(([name]) => name)).toHaveLength(14);
    expect(new Set(Migration.LABELS.map(([name]) => name)).size).toBe(14);
  });
});
