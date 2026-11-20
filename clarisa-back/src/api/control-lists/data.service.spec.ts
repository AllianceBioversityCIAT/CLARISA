import { DataService } from './data.service';
import { LIMITS } from './engine/engine.service';

/**
 * What the real-MySQL suite cannot reach: its test application keeps the
 * default 100 kB body limit, and this refusal is about megabytes.
 */
describe('control lists · records', () => {
  const list: any = {
    id: 1,
    code: 'notes',
    table_name: 'cl_notes',
    status: 'published',
  };
  const note: any = {
    id: 2,
    list_id: 1,
    code: 'note',
    label: 'Note',
    type: 'long_text',
    column_name: 'note',
    is_required: 0,
    is_unique: 0,
    status: 'published',
  };
  const make = () => {
    const sent: string[] = [];
    const data: any = {
      query: async (sql: string) => {
        sent.push(sql);
        return [];
      },
    };
    const lists: any = { fields: async () => [note] };
    return { svc: new DataService(data, lists, () => 'clarisa'), sent };
  };
  const inserts = (sent: string[]) => sent.filter((q) => /^INSERT/.test(q));
  const rows = (n: number) =>
    Array.from({ length: n }, () => ({ note: 'n'.repeat(60_000) }));

  it('add several: more text than one statement should carry is refused before the INSERT', async () => {
    expect(LIMITS.bulkBytes).toBe(2_000_000);
    const { svc, sent } = make();
    // 40 × 60,000 = 2.4 MB: one INSERT that size can pass the server's packet limit.
    await expect(
      svc.createBulk(list, { request_id: 'big', records: rows(40) }, 7),
    ).rejects.toThrow(
      'These records carry too much text for one request (the limit is 2 MB). Add them in smaller groups.',
    );
    expect(inserts(sent)).toHaveLength(0);
  });

  it('add several: under that limit everything travels in ONE statement', async () => {
    const { svc, sent } = make();
    await expect(
      svc.createBulk(list, { request_id: 'fits', records: rows(30) }, 7),
    ).resolves.toEqual({ created: 30 });
    expect(inserts(sent)).toHaveLength(1);
  });
});
