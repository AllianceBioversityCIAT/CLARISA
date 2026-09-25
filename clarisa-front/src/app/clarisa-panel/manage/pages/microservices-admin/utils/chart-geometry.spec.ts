import { bandPath, compactNumber, monotonePath, niceMax, niceTicks, paletteColor, SYSTEM_PALETTE, tickIndexes } from './chart-geometry';

describe('chart geometry', () => {
  it('draws a monotone curve through every point and never above the data', () => {
    const d = monotonePath([
      { x: 0, y: 100 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 50 }
    ]);
    expect(d.startsWith('M0,100')).toBe(true);
    expect(d).toContain(' 10,0');
    expect(d).toContain(' 30,50');
    // Between the two zeros the control points stay at zero: no invented bump.
    expect(d).toContain('C13.3,0 16.7,0 20,0');
  });

  it('handles one point and no points', () => {
    expect(monotonePath([])).toBe('');
    expect(monotonePath([{ x: 5, y: 5 }])).toBe('M5,5');
  });

  it('closes a band between a top and a bottom curve', () => {
    const d = bandPath(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ],
      [
        { x: 0, y: 10 },
        { x: 10, y: 10 }
      ]
    );
    expect(d.startsWith('M0,0')).toBe(true);
    expect(d).toContain('L10,10');
    expect(d.endsWith('Z')).toBe(true);
  });

  it('rounds axis tops to 1, 2, 2.5 or 5 by power of ten', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(180)).toBe(200);
    expect(niceMax(230)).toBe(250);
    expect(niceMax(4100)).toBe(5000);
  });

  it('writes compact numbers', () => {
    expect(compactNumber(950)).toBe('950');
    expect(compactNumber(1240)).toBe('1.2k');
    expect(compactNumber(35200)).toBe('35k');
    expect(compactNumber(2400000)).toBe('2.4M');
  });

  it('spreads x ticks and always keeps the last one', () => {
    expect(tickIndexes(5, 8)).toEqual([0, 1, 2, 3, 4]);
    expect(tickIndexes(30, 6)).toEqual([0, 6, 12, 17, 23, 29]);
    expect(tickIndexes(0, 6)).toEqual([]);
  });

  it('cycles the palette', () => {
    expect(paletteColor(0)).toBe(SYSTEM_PALETTE[0]);
    expect(paletteColor(SYSTEM_PALETTE.length + 1)).toBe(SYSTEM_PALETTE[1]);
  });

  it('picks a round step first, so the axis never reads 13, 25, 38', () => {
    expect(niceTicks(28)).toEqual([0, 10, 20, 30]);
    expect(niceTicks(47)).toEqual([0, 20, 40, 60]);
    expect(niceTicks(180)).toEqual([0, 50, 100, 150, 200]);
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
  });
});
