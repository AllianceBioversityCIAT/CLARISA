import { absoluteTime, relativeTime } from './relative-time';

describe('relativeTime', () => {
  const now = new Date('2026-09-24T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it('says Never for nothing and for garbage', () => {
    expect(relativeTime(null, now)).toBe('Never');
    expect(relativeTime(undefined, now)).toBe('Never');
    expect(relativeTime('not a date', now)).toBe('Never');
  });

  it('scales the unit with the distance', () => {
    expect(relativeTime(ago(10 * 1000), now)).toBe('Just now');
    expect(relativeTime(ago(5 * 60 * 1000), now)).toBe('5 min ago');
    expect(relativeTime(ago(3 * 3600 * 1000), now)).toBe('3 h ago');
    expect(relativeTime(ago(2 * 86400 * 1000), now)).toBe('2 d ago');
    expect(relativeTime(ago(15 * 86400 * 1000), now)).toBe('2 wk ago');
    expect(relativeTime(ago(100 * 86400 * 1000), now)).toBe('3 mo ago');
    expect(relativeTime(ago(800 * 86400 * 1000), now)).toBe('2 yr ago');
  });

  it('accepts ISO strings and flags the future', () => {
    expect(relativeTime('2026-09-24T11:00:00Z', now)).toBe('1 h ago');
    expect(relativeTime('2026-09-25T11:00:00Z', now)).toBe('In the future');
  });
});

describe('absoluteTime', () => {
  it('formats a date and dashes the rest', () => {
    expect(absoluteTime(null)).toBe('—');
    expect(absoluteTime('nope')).toBe('—');
    expect(absoluteTime('2026-09-24T11:00:00Z')).not.toBe('—');
  });
});
