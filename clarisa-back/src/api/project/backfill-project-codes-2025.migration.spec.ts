import { BackfillProjectCodes20251792170000000 } from '../../../migrations/1792170000000-BackfillProjectCodes2025';

describe('BackfillProjectCodes20251792170000000', () => {
  const match = BackfillProjectCodes20251792170000000.matchCodes;

  describe('matchCodes', () => {
    it('takes the 2026 code that opens the 2025 short_name', () => {
      const result = match(
        [
          {
            id: 146,
            short_name: 'F-AG10607-ASIA-AFRICA BLUETECH SUPERHIGHWAY',
          },
        ],
        ['F-AG10607', 'W-D-0596'],
      );
      expect([...result]).toEqual([['146', 'F-AG10607']]);
    });

    it('accepts a space or the end of the name after the code', () => {
      const result = match(
        [
          { id: 1, short_name: 'R-A-2023-77 Rice Productivity MZ' },
          { id: 2, short_name: 'W-D-0596' },
        ],
        ['R-A-2023-77', 'W-D-0596'],
      );
      expect(result.get('1')).toBe('R-A-2023-77');
      expect(result.get('2')).toBe('W-D-0596');
    });

    it('does not take a code that is only the start of a longer one', () => {
      const result = match(
        [{ id: 132, short_name: 'R-A-2022-80-REMET' }],
        ['R-A-2022-8'],
      );
      expect(result.size).toBe(0);
    });

    it('ignores case and surrounding spaces', () => {
      const result = match(
        [{ id: 7, short_name: '  t-pj-003262-An innovative approach' }],
        ['T-PJ-003262'],
      );
      expect(result.get('7')).toBe('T-PJ-003262');
    });

    it('leaves empty the names with no 2026 code', () => {
      const result = match(
        [{ id: 9, short_name: 'Increasing Pulses Productivity and Income' }],
        ['F-AG10607'],
      );
      expect(result.size).toBe(0);
    });

    it('leaves empty a name two codes could claim', () => {
      const result = match(
        [{ id: 5, short_name: 'W-D-0440-AL MURANA' }],
        ['W-D', 'W-D-0440'],
      );
      expect(result.size).toBe(0);
    });

    it('leaves aside a code that more than one 2025 project would take', () => {
      const result = match(
        [
          { id: 223, short_name: 'D-200394-Program 2- International host' },
          {
            id: 226,
            short_name: 'D-200394-Program 2- International host / pathogen',
          },
          { id: 146, short_name: 'F-AG10607-ASIA-AFRICA' },
        ],
        ['D-200394', 'F-AG10607'],
      );
      expect([...result]).toEqual([['146', 'F-AG10607']]);
    });
  });

  describe('up / down', () => {
    const runner = (responses: unknown[][]) => {
      const query = jest.fn(async (sql: string) =>
        /^\s*SELECT/.test(sql) ? (responses.shift() ?? []) : undefined,
      );
      return { query };
    };
    const updates = (query: jest.Mock) =>
      query.mock.calls
        .filter(([sql]) => /UPDATE project/.test(String(sql)))
        .map(([, params]) => params);

    it('up fills only the matched empty codes', async () => {
      const qr = runner([
        [{ external_code: 'F-AG10607' }],
        [
          { id: 146, short_name: 'F-AG10607-ASIA-AFRICA' },
          { id: 9, short_name: 'Increasing Pulses' },
        ],
      ]);
      await new BackfillProjectCodes20251792170000000().up(qr as any);
      expect(updates(qr.query)).toEqual([['F-AG10607', '146']]);
      const [sql] = qr.query.mock.calls.find(([s]) => /UPDATE/.test(s))!;
      expect(sql).toMatch(/external_code IS NULL OR external_code = ''/);
    });

    it('down leaves every code in place', async () => {
      await expect(
        new BackfillProjectCodes20251792170000000().down(),
      ).resolves.toBeUndefined();
    });
  });
});
