// LDAPAuth reads src/shared/config/config.ts, which is git-ignored and absent in CI;
// these suites never authenticate against the directory (same mock as auth.service.spec).
jest.mock('../../auth/utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));

import { INestApplication, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { apiRoutes } from '../api.routes';
import { PUBLIC_OPENAPI_PATHS } from '../../shared/swagger/public-endpoints';
import { API_KEY_SCOPE_VALUES } from '../api-key/constants/api-key-scopes';
import { GlobalConceptsModule } from './global-concepts.module';
import { GlobalConceptsMcpController } from './controllers/global-concepts-mcp.controller';
import { McpService } from './services/mcp.service';
import { ConceptsSuggestService } from './services/concepts-suggest.service';
import { ConceptsReadService } from './services/concepts-read.service';
import { UsageService } from './services/usage.service';
import { ApiKeyService } from '../api-key/api-key.service';
import { ApiKeyUsageLogService } from '../api-key/api-key-usage-log.service';
import { RenameGlobalConceptsRoutesToMeliafTaxonomy1790500300000 } from '../../../migrations/1790500300000-RenameGlobalConceptsRoutesToMeliafTaxonomy';
import { RenameMeliafTaxonomyRoutesToConcepts1790500400000 } from '../../../migrations/1790500400000-RenameMeliafTaxonomyRoutesToConcepts';

/**
 * Public prefix of the module: `api/concepts` (Yeck, 2026-09-30: shown as
 * "Concepts"; before it was `api/meliaf-taxonomy`, and before that
 * `api/global-concepts`). The old prefixes must be gone from every place that
 * publishes or authorises the path.
 */
describe('Concepts public prefix', () => {
  const entry = apiRoutes.find((r) => r.module === GlobalConceptsModule);

  it('mounts the module at concepts, and nothing at the old prefixes', () => {
    expect(entry?.path).toBe('concepts');
    expect(
      apiRoutes.some((r) =>
        ['global-concepts', 'meliaf-taxonomy'].includes(r.path),
      ),
    ).toBe(false);
  });

  it('publishes only the new prefix in the swagger allow-list', () => {
    const module = PUBLIC_OPENAPI_PATHS.filter((p) =>
      /global-concepts|meliaf-taxonomy|^\/api\/concepts\//.test(p),
    );
    expect(module.length).toBeGreaterThan(0);
    for (const p of module) expect(p.startsWith('/api/concepts/')).toBe(true);
  });

  it('names the API key scopes concepts:*', () => {
    expect(
      API_KEY_SCOPE_VALUES.filter((s) =>
        /^(global-concepts|meliaf-taxonomy):/.test(s),
      ),
    ).toEqual([]);
    for (const s of ['read', 'request', 'write', 'review'])
      expect(API_KEY_SCOPE_VALUES).toContain(`concepts:${s}`);
  });

  describe('over real HTTP, with the path taken from apiRoutes', () => {
    let app: INestApplication;

    beforeAll(async () => {
      @Module({
        controllers: [GlobalConceptsMcpController],
        providers: [
          McpService,
          ConceptsSuggestService,
          { provide: ConceptsReadService, useValue: {} },
          {
            provide: UsageService,
            useValue: { record: jest.fn(), recordList: jest.fn() },
          },
          { provide: ApiKeyService, useValue: { validate: jest.fn() } },
          {
            provide: ApiKeyUsageLogService,
            useValue: { recordUsageAsync: jest.fn() },
          },
        ],
      })
      class ProbeModule {}

      const mod = await Test.createTestingModule({
        imports: [
          ProbeModule,
          RouterModule.register([
            {
              path: 'api',
              children: [{ path: entry!.path, module: ProbeModule }],
            },
          ]),
        ],
      }).compile();
      app = mod.createNestApplication();
      await app.init();
    });
    afterAll(() => app?.close());

    const initialize = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {},
    };

    it('resolves /api/concepts/mcp', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/concepts/mcp')
        .send(initialize);
      expect(res.status).toBe(200);
      expect(res.body.result.serverInfo.name).toBe('clarisa-concepts');
    });

    it.each(['global-concepts', 'meliaf-taxonomy'])(
      'no longer answers /api/%s/mcp',
      async (old) => {
        const res = await request(app.getHttpServer())
          .post(`/api/${old}/mcp`)
          .send(initialize);
        expect(res.status).toBe(404);
      },
    );
  });
});

describe('RenameMeliafTaxonomyRoutesToConcepts1790500400000', () => {
  const run = async (dir: 'up' | 'down') => {
    const query = jest.fn(async () => undefined);
    await new RenameMeliafTaxonomyRoutesToConcepts1790500400000()[dir]({
      query,
    } as any);
    return query.mock.calls as unknown as [string, string[]][];
  };

  it('up rewrites permission routes, stored scopes and the scheme web base', async () => {
    const [[permSql, permArgs], [keySql, keyArgs], [webSql, webArgs]] =
      await run('up');
    expect(permSql).toMatch(/UPDATE permissions/);
    expect(permArgs).toEqual([
      'api/meliaf-taxonomy',
      'api/concepts',
      'api/meliaf-taxonomy',
    ]);
    expect(keySql).toMatch(/UPDATE api_keys/);
    expect(keyArgs).toEqual([
      '"meliaf-taxonomy:',
      '"concepts:',
      '"meliaf-taxonomy:',
    ]);
    expect(webSql).toMatch(/UPDATE gc_schemes/);
    expect(webArgs).toEqual([
      '/landing-page/global-concepts',
      '/landing-page/concepts',
      '/landing-page/global-concepts',
    ]);
  });

  it('down restores the old strings', async () => {
    const [[, permArgs], [, keyArgs], [, webArgs]] = await run('down');
    expect(permArgs).toEqual([
      'api/concepts',
      'api/meliaf-taxonomy',
      'api/concepts',
    ]);
    expect(keyArgs).toEqual(['"concepts:', '"meliaf-taxonomy:', '"concepts:']);
    expect(webArgs).toEqual([
      '/landing-page/concepts',
      '/landing-page/global-concepts',
      '/landing-page/concepts',
    ]);
  });

  it('the rewritten permission authorises the new admin path, not the public one', () => {
    const stored = '/api/meliaf-taxonomy/admin'.replace(
      'api/meliaf-taxonomy',
      'api/concepts',
    );
    expect('/api/concepts/admin/meliaf/concepts'.includes(stored)).toBe(true);
    expect('/api/concepts/meliaf/concepts'.includes(stored)).toBe(false);
    // The persistent concept URIs live outside /api and never match.
    expect('/concepts/meliaf/12'.includes(stored)).toBe(false);
  });
});

describe('RenameGlobalConceptsRoutesToMeliafTaxonomy1790500300000', () => {
  const run = async (dir: 'up' | 'down') => {
    const query = jest.fn(async () => undefined);
    await new RenameGlobalConceptsRoutesToMeliafTaxonomy1790500300000()[dir]({
      query,
    } as any);
    return query.mock.calls as unknown as [string, string[]][];
  };

  it('up rewrites the permission route and the stored scopes to the new name', async () => {
    const [[permSql, permArgs], [keySql, keyArgs]] = await run('up');
    expect(permSql).toMatch(/UPDATE permissions/);
    expect(permArgs).toEqual([
      'api/global-concepts',
      'api/meliaf-taxonomy',
      'api/global-concepts',
    ]);
    expect(keySql).toMatch(/UPDATE api_keys/);
    expect(keyArgs).toEqual([
      '"global-concepts:',
      '"meliaf-taxonomy:',
      '"global-concepts:',
    ]);
  });

  it('down restores the old strings', async () => {
    const [[, permArgs], [, keyArgs]] = await run('down');
    expect(permArgs).toEqual([
      'api/meliaf-taxonomy',
      'api/global-concepts',
      'api/meliaf-taxonomy',
    ]);
    expect(keyArgs).toEqual([
      '"meliaf-taxonomy:',
      '"global-concepts:',
      '"meliaf-taxonomy:',
    ]);
  });

  it('the rewritten permission still authorises the new admin path by substring', () => {
    const stored = '/api/global-concepts/admin'.replace(
      'api/global-concepts',
      'api/meliaf-taxonomy',
    );
    expect('/api/meliaf-taxonomy/admin/meliaf/concepts'.includes(stored)).toBe(
      true,
    );
    expect('/api/meliaf-taxonomy/meliaf/concepts'.includes(stored)).toBe(false);
  });
});
