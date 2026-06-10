import { isClientIpAllowed } from './ip-allowlist';

describe('isClientIpAllowed', () => {
  it('allows any IP when allowlist is empty', () => {
    expect(isClientIpAllowed('10.0.0.1', null)).toBe(true);
    expect(isClientIpAllowed(undefined, [])).toBe(true);
  });

  it('requires a client IP when allowlist is configured', () => {
    expect(isClientIpAllowed(undefined, ['10.0.0.1'])).toBe(false);
    expect(isClientIpAllowed('', ['10.0.0.1'])).toBe(false);
  });

  it('matches exact IP entries', () => {
    expect(isClientIpAllowed('10.0.0.1', ['10.0.0.1', '192.168.1.5'])).toBe(
      true,
    );
    expect(isClientIpAllowed('10.0.0.2', ['10.0.0.1'])).toBe(false);
  });
});
