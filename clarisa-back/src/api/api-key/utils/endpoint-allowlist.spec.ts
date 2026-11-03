import { isEndpointAllowed, normalizeEndpoint } from './endpoint-allowlist';

describe('endpoint allowlist', () => {
  const qa = [
    '/api/qa/catalog',
    '/api/qa/results',
    '/api/qa/results/details',
    '/api/qa/results/intake',
    '/api/qa/results/release',
  ];

  it('allows any endpoint when the key has no list', () => {
    expect(isEndpointAllowed('/zzz/nada', null)).toBe(true);
    expect(isEndpointAllowed('/zzz/nada', [])).toBe(true);
  });

  it('allows only the listed routes', () => {
    expect(isEndpointAllowed('/api/qa/results/intake', qa)).toBe(true);
    expect(isEndpointAllowed('/api/qa/results/release', qa)).toBe(true);
    expect(isEndpointAllowed('/zzz/nada', qa)).toBe(false);
  });

  it('does not let a parent route cover its children', () => {
    expect(
      isEndpointAllowed('/api/qa/results/intake', ['/api/qa/results']),
    ).toBe(false);
  });

  it('ignores the query string and a trailing slash', () => {
    expect(isEndpointAllowed('/api/qa/results/?phase_year=2026', qa)).toBe(
      true,
    );
    expect(
      isEndpointAllowed('/api/qa/catalog?x=/api/qa/results', [
        '/api/qa/results',
      ]),
    ).toBe(false);
  });

  it('rejects an empty endpoint when the key has a list', () => {
    expect(isEndpointAllowed('', qa)).toBe(false);
    expect(isEndpointAllowed(undefined, qa)).toBe(false);
  });

  it('normalizes the root and repeated trailing slashes', () => {
    expect(normalizeEndpoint('/')).toBe('/');
    expect(normalizeEndpoint(' /api/x// ')).toBe('/api/x');
  });
});
