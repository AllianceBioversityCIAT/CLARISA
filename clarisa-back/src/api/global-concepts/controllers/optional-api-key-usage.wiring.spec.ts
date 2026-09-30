import { RequestMethod } from '@nestjs/common';
import {
  INTERCEPTORS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { GlobalConceptsPublicController } from './global-concepts-public.controller';
import { ConceptUriController } from './concept-uri.controller';
import { GlobalConceptsMcpController } from './global-concepts-mcp.controller';
import { GlobalConceptsAdminController } from './global-concepts-admin.controller';
import { GlobalConceptsPlatformController } from './global-concepts-requests.controller';
import { OptionalApiKeyUsageInterceptor } from '../../../shared/interceptors/optional-api-key-usage.interceptor';

/** Every route handler of a controller: `[name, method, path]`. */
const routesOf = (controller: any): [string, RequestMethod, string][] =>
  Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => {
      const handler = controller.prototype[name];
      const method = Reflect.getMetadata(METHOD_METADATA, handler);
      const path = Reflect.getMetadata(PATH_METADATA, handler);
      return [name, method, path] as [string, RequestMethod, string];
    })
    .filter(([, method]) => method !== undefined);

const intercepts = (controller: any, name: string) => {
  const onClass = Reflect.getMetadata(INTERCEPTORS_METADATA, controller) ?? [];
  const onHandler =
    Reflect.getMetadata(INTERCEPTORS_METADATA, controller.prototype[name]) ??
    [];
  return [...onClass, ...onHandler].includes(OptionalApiKeyUsageInterceptor);
};

/**
 * Héctor, 2026-09-30: count the platforms that read MELIAF Taxonomy, not only
 * the search portal. A new public route that forgets the recorder would read
 * uncounted, silently: this spec fails instead.
 */
describe('OptionalApiKeyUsageInterceptor wiring', () => {
  it.each([
    ['public reads', GlobalConceptsPublicController],
    ['persistent URIs', ConceptUriController],
  ])('covers every route of the %s', (_label, controller) => {
    const routes = routesOf(controller);
    expect(routes.length).toBeGreaterThan(1);
    for (const [name] of routes) {
      expect([name, intercepts(controller, name)]).toEqual([name, true]);
    }
  });

  it('lists the public read routes it covers (a new one must be looked at)', () => {
    expect(
      routesOf(GlobalConceptsPublicController)
        .map(([, m, p]) => `${RequestMethod[m]} ${p}`)
        .sort(),
    ).toEqual(
      [
        'GET :scheme',
        'GET :scheme/changes',
        'GET :scheme/concepts',
        'GET :scheme/concepts/:termId',
        'GET :scheme/concepts/:termId/history',
        'GET :scheme/export',
        'GET :scheme/fields',
        'GET :scheme/releases',
        'GET lists',
        'GET schemes',
        'POST :scheme/suggest',
      ].sort(),
    );
  });

  it('covers the MCP POST, and not the 405 answers', () => {
    expect(intercepts(GlobalConceptsMcpController, 'post')).toBe(true);
    expect(intercepts(GlobalConceptsMcpController, 'get')).toBe(false);
    expect(intercepts(GlobalConceptsMcpController, 'remove')).toBe(false);
  });

  it.each([
    ['admin', GlobalConceptsAdminController],
    [
      'platform (ApiKeyGuard already records)',
      GlobalConceptsPlatformController,
    ],
  ])('stays off the %s routes', (_label, controller) => {
    for (const [name] of routesOf(controller)) {
      expect([name, intercepts(controller, name)]).toEqual([name, false]);
    }
  });
});
