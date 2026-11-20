import { seconds } from './control-lists.config';

describe('control lists · configuration', () => {
  it('an empty or odd number of seconds falls back to the default, never NaN', () => {
    // NaN made the reconciler fire every millisecond and the grace period never end.
    for (const raw of [undefined, '', '  ', 'abc', '0', '-5'])
      expect(seconds(raw, 60)).toBe(60);
    expect(seconds('15', 60)).toBe(15);
  });
});
