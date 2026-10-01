import { StableOptions } from './stable-options';

describe('StableOptions', () => {
  it('returns the same array while the dependencies do not change', () => {
    const cache = new StableOptions<number>();
    const source = [1, 2];
    const build = jest.fn(() => source.map(n => n * 10));
    const first = cache.get([source], build);
    expect(cache.get([source], build)).toBe(first);
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('rebuilds when any dependency changes', () => {
    const cache = new StableOptions<string>();
    const a = cache.get(['x', 1], () => ['a']);
    const b = cache.get(['x', 2], () => ['b']);
    expect(b).not.toBe(a);
    expect(b).toEqual(['b']);
  });
});
