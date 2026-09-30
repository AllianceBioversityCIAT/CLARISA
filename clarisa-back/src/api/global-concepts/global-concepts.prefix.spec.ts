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

/**
 * Public prefix of the module: `api/meliaf-taxonomy` (Héctor, 2026-09-29,
 * "renombren el end-point para MELIAF Taxonomy"). The old `api/global-concepts`
 * must be gone from every place that publishes or authorises the path.
 */
describe('MELIAF Taxonomy public prefix', () => {
  const entry = apiRoutes.find((r) => r.module === GlobalConceptsModule);

  it('mounts the module at meliaf-taxonomy, and nothing at global-concepts', () => {
    expect(entry?.path).toBe('meliaf-taxonomy');
    expect(apiRoutes.some((r) => r.path === 'global-concepts')).toBe(false);
  });

  it('publishes only the new prefix in the swagger allow-list', () => {
    const module = PUBLIC_OPENAPI_PATHS.filter((p) =>
      /global-concepts|meliaf-taxonomy/.test(p),
    );
    expect(module.length).toBeGreaterThan(0);
    for (const p of module)
      expect(p.startsWith('/api/meliaf-taxonomy/')).toBe(true);
  });

  it('names the API key scopes meliaf-taxonomy:*', () => {
    expect(
      API_KEY_SCOPE_VALUES.filter((s) => s.startsWith('global-concepts:')),
    ).toEqual([]);
    for (const s of ['read', 'request', 'write', 'review'])
      expect(API_KEY_SCOPE_VALUES).toContain(`meliaf-taxonomy:${s}`);
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

    it('resolves /api/meliaf-taxonomy/mcp', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/meliaf-taxonomy/mcp')
        .send(initialize);
      expect(res.status).toBe(200);
      expect(res.body.result.serverInfo.name).toBe('clarisa-meliaf-taxonomy');
    });

    it('no longer answers /api/global-concepts/mcp', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/global-concepts/mcp')
        .send(initialize);
      expect(res.status).toBe(404);
    });
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
