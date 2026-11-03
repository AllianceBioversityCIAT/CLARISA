import { isEndpointGranted, normalizeEndpoint } from './endpoint-allowlist';

describe('endpoint grants', () => {
  const qa = [
    '/api/qa/catalog',
    '/api/qa/results',
    '/api/qa/results/details',
    '/api/qa/results/intake',
    '/api/qa/results/release',
  ];

  it('grants nothing to a key without a list', () => {
    expect(isEndpointGranted('/api/qa/results/intake', null)).toBe(false);
    expect(isEndpointGranted('/api/qa/results/intake', [])).toBe(false);
  });

  it('grants only the listed routes', () => {
    expect(isEndpointGranted('/api/qa/results/intake', qa)).toBe(true);
    expect(isEndpointGranted('/api/qa/results/release', qa)).toBe(true);
    expect(isEndpointGranted('/zzz/nada', qa)).toBe(false);
  });

  it('does not let a parent route cover its children', () => {
    expect(
      isEndpointGranted('/api/qa/results/intake', ['/api/qa/results']),
    ).toBe(false);
  });

  it('ignores the query string and a trailing slash', () => {
    expect(isEndpointGranted('/api/qa/results/?phase_year=2026', qa)).toBe(
      true,
    );
    expect(
      isEndpointGranted('/api/qa/catalog?x=/api/qa/results', [
        '/api/qa/results',
      ]),
    ).toBe(false);
  });

  it('grants nothing for an empty endpoint', () => {
    expect(isEndpointGranted('', qa)).toBe(false);
    expect(isEndpointGranted(undefined, qa)).toBe(false);
  });

  it('normalizes the root and repeated trailing slashes', () => {
    expect(normalizeEndpoint('/')).toBe('/');
    expect(normalizeEndpoint(' /api/x// ')).toBe('/api/x');
  });
});
