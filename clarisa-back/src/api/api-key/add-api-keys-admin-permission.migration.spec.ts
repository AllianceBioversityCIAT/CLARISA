import { AddApiKeysAdminPermission1790600300000 as Migration } from '../../../migrations/1790600300000-AddApiKeysAdminPermission';

describe('AddApiKeysAdminPermission1790600300000', () => {
  const runner = () => {
    const calls: Array<[string, unknown[]]> = [];
    const qr = {
      query: jest.fn(async (sql: string, params: unknown[] = []) => {
        calls.push([sql.replace(/\s+/g, ' ').trim(), params]);
        return [];
      }),
    };
    return { qr, calls };
  };

  it('adds /api/api-keys with its plain wording, behind NOT EXISTS, without DDL', async () => {
    const { qr, calls } = runner();
    await new Migration().up(qr as any);

    for (const [sql] of calls) {
      expect(sql).not.toMatch(/^(ALTER|DROP|CREATE|DELETE)\b/i);
    }
    const inserts = calls.filter(([sql]) => /^INSERT/.test(sql));
    expect(inserts).toHaveLength(2);
    inserts.forEach(([sql]) => expect(sql).toMatch(/NOT EXISTS/));

    const [permission, grant] = inserts;
    expect(permission[0]).toMatch(/^INSERT INTO permissions/);
    expect(permission[1]).toEqual([
      '/api/api-keys',
      'Systems and API keys',
      'Manage API keys and usage',
      Migration.DESCRIPTION,
      3043,
      '/api/api-keys',
    ]);
    expect(grant[0]).toMatch(/^INSERT INTO role_permission/);
    expect(grant[1]).toEqual([3043, '/api/api-keys', 'SA']);
  });

  it('grants it to SA only', () => {
    expect(Migration.ROLE_ACRONYM).toBe('SA');
  });

  it('fills metadata only where it is still NULL (a hand-edited label is kept)', async () => {
    const { qr, calls } = runner();
    await new Migration().up(qr as any);
    const updates = calls.filter(([sql]) => /^UPDATE permissions/.test(sql));
    expect(updates).toHaveLength(1);
    expect(updates[0][0]).toMatch(/label = COALESCE\(label, \?\)/);
    expect(updates[0][1]).toEqual([
      'Systems and API keys',
      'Manage API keys and usage',
      Migration.DESCRIPTION,
      '/api/api-keys',
    ]);
  });

  it('down removes the grants and the permission it added, nothing else', async () => {
    const { qr, calls } = runner();
    await new Migration().down(qr as any);
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toMatch(/^DELETE rp FROM role_permission rp/);
    expect(calls[1][0]).toBe('DELETE FROM permissions WHERE name = ?');
    calls.forEach(([, params]) => expect(params).toEqual(['/api/api-keys']));
  });
});
