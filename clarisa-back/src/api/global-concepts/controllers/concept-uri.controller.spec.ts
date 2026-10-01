import { ConceptUriController } from './concept-uri.controller';
import {
  DEFAULT_SCHEME_CODE,
  conceptPagePath,
  conceptUri,
  schemeUri,
} from '../global-concepts.config';

/**
 * The default scheme's URIs carry no scheme segment (Yeck, 2026-10-01:
 * `clarisatest-back.ciat.cgiar.org/concepts/2374`).
 */
describe('persistent URIs of the default scheme (meliaf-taxonomy)', () => {
  const base = { uri_base: 'https://api.clarisa.cgiar.org/concepts' };

  it('carry the scheme code, the default one included', () => {
    expect(DEFAULT_SCHEME_CODE).toBe('meliaf-taxonomy');
    expect(schemeUri({ ...base, code: 'meliaf-taxonomy' })).toBe(
      'https://api.clarisa.cgiar.org/concepts/meliaf-taxonomy',
    );
    expect(conceptUri({ ...base, code: 'meliaf-taxonomy' }, 2374)).toBe(
      'https://api.clarisa.cgiar.org/concepts/meliaf-taxonomy/2374',
    );
    expect(conceptUri({ ...base, code: 'prms' }, 12)).toBe(
      'https://api.clarisa.cgiar.org/concepts/prms/12',
    );
    expect(conceptPagePath('meliaf-taxonomy', 2374)).toBe(
      '/meliaf-taxonomy/2374',
    );
    expect(conceptPagePath('prms', 12)).toBe('/prms/12');
  });

  describe('ConceptUriController', () => {
    const concept = { scheme: 'meliaf-taxonomy', term_id: 2374 };
    const build = () => {
      const read = {
        get: jest.fn(async () => concept),
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

    it('/concepts/2374 still opens the concept of the default scheme', async () => {
      const { controller, read, res } = build();
      await controller.segment('2374', res, 'text/html');
      expect(read.get).toHaveBeenCalledWith('meliaf-taxonomy', 2374);
      expect(res.redirect).toHaveBeenCalledWith(
        303,
        'https://clarisa.cgiar.org/landing-page/concepts/meliaf-taxonomy/2374',
      );
    });

    it('/concepts/2374?format=json answers the data', async () => {
      const { controller, exporter, res } = build();
      await controller.segment('2374', res, '', 'json');
      expect(exporter.render).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('a non-numeric segment is still a scheme', async () => {
      const { controller, read, res } = build();
      await controller.segment('prms', res, 'text/html');
      expect(read.scheme).toHaveBeenCalledWith('prms');
      expect(read.get).not.toHaveBeenCalled();
    });

    it('/concepts alone is the default scheme', async () => {
      const { controller, read, res } = build();
      await controller.defaultScheme(res, 'text/html');
      expect(read.scheme).toHaveBeenCalledWith('meliaf-taxonomy');
    });
  });
});
