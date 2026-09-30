import { ConceptsReadService } from './concepts-read.service';

/** MySQL 8 reserved words that must never be a bare alias in raw selects. */
const RESERVED = ['cursor', 'order', 'key', 'range', 'rank', 'rows'];

describe('ConceptsReadService.changes', () => {
  const build = (rows: unknown[]) => {
    const selects: string[] = [];
    const qb: Record<string, jest.Mock> = {};
    for (const m of ['innerJoin', 'where', 'andWhere', 'orderBy', 'limit']) {
      qb[m] = jest.fn(() => qb);
    }
    qb.select = jest.fn((cols: string[]) => {
      selects.push(...cols);
      return qb;
    });
    qb.getRawMany = jest.fn(async () => rows);
    const dataSource = {
      manager: { createQueryBuilder: jest.fn(() => qb) },
    } as any;
    const loader = { scheme: jest.fn(async () => ({ id: 1 })) } as any;
    return { service: new ConceptsReadService(dataSource, loader), selects };
  };

  it('uses no MySQL reserved word as a bare alias (the 500 on ?since=0)', async () => {
    const { service, selects } = build([]);
    await service.changes('meliaf', 0);
    const aliases = selects.map((s) => s.split(/\s+AS\s+/i)[1]?.trim());
    expect(aliases.length).toBeGreaterThan(0);
    for (const alias of aliases) {
      expect(RESERVED).not.toContain(alias?.toLowerCase());
    }
  });

  it('maps rows to the public shape and moves the cursor', async () => {
    const { service } = build([
      {
        change_cursor: '7',
        term_id: '2374',
        action: 'status',
        changed_at: new Date('2026-09-29T15:00:00Z'),
      },
    ]);
    const out = await service.changes('meliaf', 0);
    expect(out.changes).toEqual([
      {
        cursor: 7,
        term_id: 2374,
        action: 'status',
        changed_at: new Date('2026-09-29T15:00:00Z'),
      },
    ]);
    expect(out.next_cursor).toBe(7);
  });

  it('keeps the incoming cursor when nothing changed', async () => {
    const { service } = build([]);
    expect((await service.changes('meliaf', 12)).next_cursor).toBe(12);
  });
});
