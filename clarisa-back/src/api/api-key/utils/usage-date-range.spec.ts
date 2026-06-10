import { resolveUsageDateRange } from './usage-date-range';

describe('resolveUsageDateRange', () => {
  it('defaults to a 30-day window ending at end of today', () => {
    const { from, to } = resolveUsageDateRange();
    const diffDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
    expect(to.getHours()).toBe(23);
    expect(to.getMinutes()).toBe(59);
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
  });

  it('parses explicit from/to values using full calendar days', () => {
    const { from, to } = resolveUsageDateRange(
      '2026-05-01T12:00:00.000Z',
      '2026-06-01T12:00:00.000Z',
    );
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
    expect(to.getHours()).toBe(23);
    expect(to.getMinutes()).toBe(59);
  });

  it('rejects inverted ranges', () => {
    expect(() =>
      resolveUsageDateRange(
        '2026-06-01T00:00:00.000Z',
        '2026-05-01T00:00:00.000Z',
      ),
    ).toThrow('"from" must be before "to"');
  });
});
