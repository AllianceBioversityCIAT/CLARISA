import { ConceptUriController } from './concept-uri.controller';
import {
  DEFAULT_SCHEME_CODE,
  GLOSSARY_COLLECTION_CODE,
  conceptPagePath,
  glossaryPageUrl,
  conceptUri,
  schemeUri,
} from '../global-concepts.config';

/**
 * The default scheme's URIs carry no scheme segment (Yeck, 2026-10-01:
 * `clarisatest-back.ciat.cgiar.org/concepts/2374`).
 */
describe('persistent URIs (meliaf-taxonomy is the root)', () => {
  const env = { uri_base: 'https://api.clarisa.cgiar.org' };

  it('are {host}/{scheme}/{termId}; a base still ending in /concepts is read as its host', () => {
    expect(DEFAULT_SCHEME_CODE).toBe('meliaf-taxonomy');
    expect(schemeUri({ ...env, code: 'meliaf-taxonomy' })).toBe(
      'https://api.clarisa.cgiar.org/meliaf-taxonomy',
    );
    expect(conceptUri({ ...env, code: 'meliaf-taxonomy' }, 2374)).toBe(
      'https://api.clarisa.cgiar.org/meliaf-taxonomy/2374',
    );
    expect(
      conceptUri(
        {
          uri_base: 'https://api.clarisa.cgiar.org/concepts/',
          code: 'meliaf-taxonomy',
        },
        2374,
      ),
    ).toBe('https://api.clarisa.cgiar.org/meliaf-taxonomy/2374');
    expect(conceptPagePath('meliaf-taxonomy', 2374)).toBe(
      '/meliaf-taxonomy/2374',
    );
  });

  it('glossaryPageUrl: the glossary page next to the taxonomy pages; null when the base is not that site', () => {
    expect(GLOSSARY_COLLECTION_CODE).toBe('glossary');
    expect(
      glossaryPageUrl('https://clarisa.cgiar.org/landing-page/concepts', 391),
    ).toBe('https://clarisa.cgiar.org/landing-page/glossary/term/391');
    expect(
      glossaryPageUrl(
        'https://clarisatest-web.ciat.cgiar.org/landing-page/concepts/',
        7,
      ),
    ).toBe(
      'https://clarisatest-web.ciat.cgiar.org/landing-page/glossary/term/7',
    );
    expect(
      glossaryPageUrl('https://other.example.org/taxonomy', 391),
    ).toBeNull();
  });

  describe('ConceptUriController', () => {
    const concept = {
      scheme: 'meliaf-taxonomy',
      term_id: 2374,
      status: 'approved',
      collections: [] as { code: string; label: string }[],
    };
    const build = (
      collections: { code: string; label: string }[] = [],
      status = 'approved',
    ) => {
      const read = {
        get: jest.fn(async () => ({ ...concept, collections, status })),
        scheme: jest.fn(async () => ({ code: 'meliaf-taxonomy' })),
      };
      const loader = {
        scheme: jest.fn(async () => ({
          code: 'meliaf-taxonomy',
          web_base: 'https://clarisa.cgiar.org/landing-page/concepts',
        })),
      };
      const exporter = {
        render: jest.fn(() => ({
          contentType: 'application/json',
          body: '{}',
        })),
        export: jest.fn(async () => ({
          contentType: 'application/json',
          body: '[]',
        })),
      };
      const usage = { record: jest.fn() };
      const controller = new ConceptUriController(
        read as any,
        exporter as any,
        loader as any,
        { manager: {} } as any,
        usage as any,
      );
      const res: any = {
        setHeader: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn(() => res),
        send: jest.fn(),
      };
      return { controller, read, exporter, res };
    };

    it('/meliaf-taxonomy/2374 sends a browser to the concept page', async () => {
      const { controller, read, res } = build();
      await controller.concept(2374, res, 'text/html');
      expect(read.get).toHaveBeenCalledWith('meliaf-taxonomy', 2374);
      expect(res.redirect).toHaveBeenCalledWith(
        303,
        'https://clarisa.cgiar.org/landing-page/concepts/meliaf-taxonomy/2374',
      );
    });

    it('a glossary term sends a browser to its glossary page, not the taxonomy page', async () => {
      const { controller, read, res } = build([
        { code: 'glossary', label: 'Glossary' },
      ]);
      await controller.concept(391, res, 'text/html');
      expect(read.get).toHaveBeenCalledWith('meliaf-taxonomy', 391);
      expect(res.redirect).toHaveBeenCalledWith(
        303,
        'https://clarisa.cgiar.org/landing-page/glossary/term/2374',
      );
    });

    it('a deprecated glossary term also opens its glossary page (the taxonomy pages are hidden)', async () => {
      const { controller, res } = build(
        [{ code: 'glossary', label: 'Glossary' }],
        'deprecated',
      );
      await controller.concept(1, res, 'text/html');
      expect(res.redirect).toHaveBeenCalledWith(
        303,
        'https://clarisa.cgiar.org/landing-page/glossary/term/2374',
      );
    });

    it('a deprecated concept outside the glossary keeps the taxonomy page', async () => {
      const { controller, res } = build([], 'deprecated');
      await controller.concept(2374, res, 'text/html');
      expect(res.redirect).toHaveBeenCalledWith(
        303,
        'https://clarisa.cgiar.org/landing-page/concepts/meliaf-taxonomy/2374',
      );
    });

    it('a deprecated glossary term asked as data still answers the data', async () => {
      const { controller, exporter, res } = build(
        [{ code: 'glossary', label: 'Glossary' }],
        'deprecated',
      );
      await controller.concept(391, res, 'text/turtle');
      await controller.concept(391, res, 'text/html', 'jsonld');
      expect(res.redirect).not.toHaveBeenCalled();
      expect(exporter.render).toHaveBeenCalledTimes(2);
      expect(
        (exporter.render.mock.calls as unknown[][]).map((c) => c[2]),
      ).toEqual(['skos', 'jsonld']);
    });

    it('a concept in another collection keeps the taxonomy page', async () => {
      const { controller, res } = build([{ code: 'indicators', label: 'X' }]);
      await controller.concept(2374, res, 'text/html');
      expect(res.redirect).toHaveBeenCalledWith(
        303,
        'https://clarisa.cgiar.org/landing-page/concepts/meliaf-taxonomy/2374',
      );
    });

    it('a glossary term asked as data still answers the data (no redirect)', async () => {
      const { controller, exporter, res } = build([
        { code: 'glossary', label: 'Glossary' },
      ]);
      await controller.concept(391, res, 'application/ld+json');
      expect(res.redirect).not.toHaveBeenCalled();
      expect(exporter.render).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('/meliaf-taxonomy/2374?format=json answers the data', async () => {
      const { controller, exporter, res } = build();
      await controller.concept(2374, res, '', 'json');
      expect(exporter.render).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('/meliaf-taxonomy alone is the scheme', async () => {
      const { controller, read, res } = build();
      await controller.defaultScheme(res, 'text/html');
      expect(read.scheme).toHaveBeenCalledWith('meliaf-taxonomy');
    });
  });
});
