import { GlobalConceptsConfig, webBaseOf } from './global-concepts.config';

describe('webBaseOf', () => {
  it('uses the scheme web_base when set, without a trailing slash', () => {
    expect(
      webBaseOf({
        web_base:
          'https://clarisatest-web.ciat.cgiar.org/landing-page/concepts/',
      }),
    ).toBe('https://clarisatest-web.ciat.cgiar.org/landing-page/concepts');
  });

  it('falls back to the module default when the scheme has none', () => {
    expect(webBaseOf({ web_base: null })).toBe(GlobalConceptsConfig.webBase);
    expect(webBaseOf({ web_base: '' })).toBe(GlobalConceptsConfig.webBase);
    expect(webBaseOf(null)).toBe(GlobalConceptsConfig.webBase);
  });
});
