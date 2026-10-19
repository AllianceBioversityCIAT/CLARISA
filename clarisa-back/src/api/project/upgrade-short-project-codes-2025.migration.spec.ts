import { UpgradeShortProjectCodes20251792420000000 } from '../../../migrations/1792420000000-UpgradeShortProjectCodes2025';

describe('UpgradeShortProjectCodes20251792420000000', () => {
  const match = UpgradeShortProjectCodes20251792420000000.matchShortCodes;

  describe('matchShortCodes', () => {
    it('takes the only 2026 code that ends in the short code', () => {
      const result = match(
        [
          { id: 192, external_code: 'D514' },
          { id: 4, external_code: 'S245' },
          { id: 55, external_code: 'A1540' },
        ],
        ['C-D514', 'C-S245', 'B-A1540', 'F-AG10607'],
      );
      expect([...result]).toEqual([
        ['192', 'C-D514'],
        ['4', 'C-S245'],
        ['55', 'B-A1540'],
      ]);
    });

    it('needs a dash right before the short code', () => {
      const result = match(
        [{ id: 1, external_code: 'D514' }],
        ['C-D5140', 'C-XD514', 'D514X'],
      );
      expect(result.size).toBe(0);
    });

    it('ignores case and surrounding spaces', () => {
      const result = match([{ id: 2, external_code: ' d514 ' }], ['C-D514 ']);
      expect(result.get('2')).toBe('C-D514');
    });

    it('keeps the short code when two 2026 codes end in it', () => {
      const result = match(
        [{ id: 3, external_code: 'F100' }],
        ['A-F100', 'B-F100'],
      );
      expect(result.size).toBe(0);
    });

    it('keeps the short code when no 2026 code ends in it', () => {
      const result = match([{ id: 5, external_code: 'D409' }], ['C-D514']);
      expect(result.size).toBe(0);
    });

    it('leaves alone a code that already is a 2026 code', () => {
      const result = match(
        [{ id: 146, external_code: 'F-AG10607' }],
        ['F-AG10607'],
      );
      expect(result.size).toBe(0);
    });

    it('does not take a 2026 code another 2025 project already has', () => {
      const result = match(
        [
          { id: 6, external_code: 'D514' },
          { id: 7, external_code: 'C-D514' },
        ],
        ['C-D514'],
      );
      expect(result.size).toBe(0);
    });

    it('leaves aside a code that more than one 2025 project would take', () => {
      const result = match(
        [
          { id: 8, external_code: 'D514' },
          { id: 9, external_code: 'd514' },
          { id: 4, external_code: 'S245' },
        ],
        ['C-D514', 'C-S245'],
      );
      expect([...result]).toEqual([['4', 'C-S245']]);
    });
  });

  describe('up / down', () => {
    const runner = (responses: unknown[][]) => {
      const query = jest.fn(async (sql: string) =>
        /^\s*SELECT/.test(sql) ? (responses.shift() ?? []) : undefined,
      );
      return { query };
    };

    it('up replaces only the matched short codes, guarded by the old value', async () => {
      const qr = runner([
        [{ external_code: 'C-D514' }, { external_code: 'F-AG10607' }],
        [
          { id: 192, external_code: 'D514' },
          { id: 146, external_code: 'F-AG10607' },
          { id: 30, external_code: 'D409' },
        ],
      ]);
      await new UpgradeShortProjectCodes20251792420000000().up(qr as any);
      const updates = (qr.query as jest.Mock).mock.calls.filter(([sql]) =>
        /UPDATE project/.test(String(sql)),
      );
      expect(updates.map(([, params]) => params)).toEqual([
        ['C-D514', '192', 'D514'],
      ]);
      expect(updates[0][0]).toMatch(/WHERE id = \? AND external_code = \?/);
    });

    it('down leaves every code in place', async () => {
      await expect(
        new UpgradeShortProjectCodes20251792420000000().down(),
      ).resolves.toBeUndefined();
    });
  });
});
