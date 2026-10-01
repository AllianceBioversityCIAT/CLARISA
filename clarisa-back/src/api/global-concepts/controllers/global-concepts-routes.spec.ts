// LDAPAuth reads src/shared/config/config.ts, which is git-ignored and absent in CI;
// these suites never authenticate against the directory (same mock as auth.service.spec).
jest.mock('../../../auth/utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));

import { INestApplication } from '@nestjs/common';
import { MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { GlobalConceptsModule } from '../global-concepts.module';
import { GlobalConceptsAdminController } from './global-concepts-admin.controller';
import { GlobalConceptsPublicController } from './global-concepts-public.controller';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../shared/guards/permission.guard';
import { ConceptsAdminService } from '../services/concepts-admin.service';
import { ReleasesService } from '../services/releases.service';
import { RequestsService } from '../services/requests.service';
import { AiService } from '../services/ai.service';
import { AiAssistService } from '../services/ai-assist.service';
import { ConceptsImportService } from '../services/concepts-import.service';
import { ConceptsCatalogService } from '../services/concepts-catalog.service';
import { EmbeddingsService } from '../services/embeddings.service';
import { ConceptGraphLoader } from '../services/concept-graph.loader';
import { ConceptsIconsService } from '../services/concepts-icons.service';
import { ConceptsFieldsService } from '../services/concepts-fields.service';
import { UsageService } from '../services/usage.service';
import { ConceptsReadService } from '../services/concepts-read.service';
import { ConceptsExportService } from '../services/concepts-export.service';
import { ConceptsSuggestService } from '../services/concepts-suggest.service';
import { PublicRateLimitGuard } from '../utils/public-rate-limit.guard';
import { PlatformUsageService } from '../services/platform-usage.service';
import { ApiKeyService } from '../../api-key/api-key.service';
import { ApiKeyUsageLogService } from '../../api-key/api-key-usage-log.service';
import { currentApiKeyCaller } from '../../../shared/utils/api-key-caller-context';

/**
 * Route order over real HTTP, with the controllers in the order the module
 * declares them: the new admin routes (icons, fields, import-fields, usage,
 * AI draft) must reach the admin controller, and the public `:scheme/...`
 * routes must never capture an `admin/...` path.
 */
describe('Global Concepts routes (HTTP)', () => {
  let app: INestApplication;
  const hit = (name: string) => jest.fn(async () => ({ handler: name }));
  const icons = {
    list: hit('icons.list'),
    create: hit('icons.create'),
    update: hit('icons.update'),
    remove: hit('icons.remove'),
  };
  const fields = {
    list: hit('fields.list'),
    create: hit('fields.create'),
    update: hit('fields.update'),
    importFields: hit('fields.importFields'),
  };
  const usage = {
    summary: hit('usage.summary'),
    record: jest.fn(),
    recordList: jest.fn(),
  };
  const read = {
    fields: hit('read.fields'),
    scheme: hit('read.scheme'),
    list: jest.fn(async () => [{ term_id: 1 }]),
    get: jest.fn(async () => ({ term_id: 7 })),
  };
  const assist = { draft: hit('assist.draft') };
  const catalog = {
    listValues: hit('catalog.listValues'),
    addListValue: hit('catalog.addListValue'),
  };
  const admin = { get: hit('admin.get'), list: hit('admin.list') };
  const platformUsage = { byPlatform: hit('platformUsage.byPlatform') };
  const apiKeys = { validate: jest.fn() };
  const usageLog = { recordUsageAsync: jest.fn() };
  const exporter = {
    export: jest.fn(async () => ({
      body: '{}',
      contentType: 'application/json',
      fileName: 'x.json',
    })),
  };

  const declared = (): any[] =>
    Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, GlobalConceptsModule);

  beforeAll(async () => {
    const order = declared().filter((c) =>
      [GlobalConceptsAdminController, GlobalConceptsPublicController].includes(
        c,
      ),
    );
    const mod = await Test.createTestingModule({
      controllers: order,
      providers: [
        PublicRateLimitGuard,
        { provide: ConceptsAdminService, useValue: admin },
        { provide: ReleasesService, useValue: {} },
        { provide: RequestsService, useValue: {} },
        { provide: AiService, useValue: {} },
        { provide: AiAssistService, useValue: assist },
        { provide: ConceptsImportService, useValue: {} },
        { provide: ConceptsCatalogService, useValue: catalog },
        { provide: EmbeddingsService, useValue: {} },
        { provide: ConceptGraphLoader, useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: ConceptsIconsService, useValue: icons },
        { provide: ConceptsFieldsService, useValue: fields },
        { provide: UsageService, useValue: usage },
        { provide: ConceptsReadService, useValue: read },
        { provide: ConceptsExportService, useValue: exporter },
        { provide: ConceptsSuggestService, useValue: {} },
        { provide: PlatformUsageService, useValue: platformUsage },
        { provide: ApiKeyService, useValue: apiKeys },
        { provide: ApiKeyUsageLogService, useValue: usageLog },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = mod.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => {
      req.user = { email: 'admin@cgiar.org' };
      next();
    });
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('declares the admin controller before the public one', () => {
    const list = declared();
    expect(list.indexOf(GlobalConceptsAdminController)).toBeGreaterThanOrEqual(
      0,
    );
    expect(list.indexOf(GlobalConceptsAdminController)).toBeLessThan(
      list.indexOf(GlobalConceptsPublicController),
    );
    expect(
      Reflect.getMetadata(PATH_METADATA, GlobalConceptsAdminController),
    ).toBe('admin');
  });

  it.each([
    ['get', '/admin/concepts/7/icons', 'icons.list'],
    ['post', '/admin/concepts/7/icons', 'icons.create'],
    ['patch', '/admin/icons/3', 'icons.update'],
    ['delete', '/admin/icons/3', 'icons.remove'],
    ['get', '/admin/fields', 'fields.list'],
    ['post', '/admin/fields', 'fields.create'],
    ['patch', '/admin/fields/2', 'fields.update'],
    ['get', '/admin/import-fields', 'fields.importFields'],
    ['get', '/admin/usage?days=7', 'usage.summary'],
    [
      'get',
      '/admin/usage/platforms?from=2026-09-01&to=2026-09-30',
      'platformUsage.byPlatform',
    ],
    ['get', '/fields', 'read.fields'],
    ['get', '/admin/concepts-meta/fields', 'fields.list'],
    ['get', '/admin/concepts-meta/lists', 'catalog.listValues'],
    ['get', '/admin/lists', 'catalog.listValues'],
    ['get', '/admin/concepts', 'admin.list'],
    ['get', '/admin/concepts/7', 'admin.get'],
    ['patch', '/admin/concepts/7/icons/3', 'icons.update'],
    ['delete', '/admin/concepts/7/icons/3', 'icons.remove'],
  ])('%s %s reaches %s', async (method, path, handler) => {
    const body =
      handler === 'icons.create'
        ? { icon_status: 'draft' }
        : handler === 'fields.create'
          ? { code: 'owner', label: 'Owner', type: 'text' }
          : handler === 'fields.update'
            ? { label: 'Owner' }
            : {};
    const res = await (request(app.getHttpServer()) as any)
      [method](path)
      .send(body);
    expect(res.body).toEqual({ handler });
    expect(read.scheme).not.toHaveBeenCalled();
  });

  it.each(['post', 'put', 'patch', 'delete'])(
    'the concepts-meta copies are GET only (%s is 404)',
    async (method) => {
      for (const path of [
        '/admin/concepts-meta/fields',
        '/admin/concepts-meta/lists',
        '/admin/concepts-meta/fields/2',
        '/admin/concepts-meta/lists/4',
      ]) {
        const res = await (request(app.getHttpServer()) as any)
          [method](path)
          .send({ label: 'x', list_code: 'x', value: 'x' });
        expect(res.status).toBe(404);
      }
      expect(fields.create).not.toHaveBeenCalled();
      expect(fields.update).not.toHaveBeenCalled();
      expect(catalog.addListValue).not.toHaveBeenCalled();
    },
  );

  it('the concepts-meta copies call the same services as the setup routes', async () => {
    await request(app.getHttpServer()).get('/admin/concepts-meta/fields');
    expect(fields.list).toHaveBeenCalledWith('meliaf-taxonomy');
    await request(app.getHttpServer()).get('/admin/concepts-meta/lists');
    expect(catalog.listValues).toHaveBeenCalledWith('meliaf-taxonomy');
    expect(admin.get).not.toHaveBeenCalled();
  });

  it('the nested icon aliases pass the concept term id to the service', async () => {
    await request(app.getHttpServer())
      .patch('/admin/concepts/7/icons/3')
      .send({ icon_code: 'IC7' });
    expect(icons.update).toHaveBeenCalledWith(
      'meliaf-taxonomy',
      3,
      { icon_code: 'IC7' },
      expect.objectContaining({ email: 'admin@cgiar.org' }),
      7,
    );
    await request(app.getHttpServer()).delete('/admin/concepts/7/icons/3');
    expect(icons.remove).toHaveBeenCalledWith(
      'meliaf-taxonomy',
      3,
      expect.objectContaining({ email: 'admin@cgiar.org' }),
      7,
    );
    // The old full-admin routes keep working without a concept check.
    await request(app.getHttpServer()).delete('/admin/icons/3');
    expect(icons.remove).toHaveBeenLastCalledWith(
      'meliaf-taxonomy',
      3,
      expect.objectContaining({ email: 'admin@cgiar.org' }),
    );
  });

  it('passes the usage window as a number', async () => {
    await request(app.getHttpServer()).get('/admin/usage?days=7');
    expect(usage.summary).toHaveBeenCalledWith('meliaf-taxonomy', 7);
    await request(app.getHttpServer()).get('/admin/usage');
    expect(usage.summary).toHaveBeenLastCalledWith('meliaf-taxonomy', 30);
  });

  it('refuses code or type in a field PATCH (immutable)', async () => {
    const res = await request(app.getHttpServer())
      .patch('/admin/fields/2')
      .send({ code: 'renamed', type: 'number' });
    expect(res.status).toBe(400);
    expect(fields.update).not.toHaveBeenCalled();
  });

  it('keeps the AI draft behind the AI guard (404 while AI is off)', async () => {
    delete process.env.GLOBAL_CONCEPTS_AI_ENABLED;
    const res = await request(app.getHttpServer())
      .post('/admin/ai/draft')
      .send({
        preferred_label: 'Outcome',
        definition: 'A change',
        fields: ['scope_note'],
      });
    expect(res.status).toBe(404);
    expect(assist.draft).not.toHaveBeenCalled();
  });

  it('reaches the AI draft when AI is on, validating the body', async () => {
    process.env.GLOBAL_CONCEPTS_AI_ENABLED = 'true';
    process.env.OPEN_AI_CLARISA_ASSISTANT_TOKEN = 'sk-test';
    try {
      const bad = await request(app.getHttpServer())
        .post('/admin/ai/draft')
        .send({
          preferred_label: 'Outcome',
          definition: 'x',
          fields: ['notes'],
        });
      expect(bad.status).toBe(400);
      const ok = await request(app.getHttpServer())
        .post('/admin/ai/draft')
        .send({
          preferred_label: 'Outcome',
          definition: 'A change',
          fields: ['scope_note'],
        });
      expect(ok.body).toEqual({ handler: 'assist.draft' });
    } finally {
      delete process.env.GLOBAL_CONCEPTS_AI_ENABLED;
      delete process.env.OPEN_AI_CLARISA_ASSISTANT_TOKEN;
    }
  });

  it('counts public reads after answering them', async () => {
    await request(app.getHttpServer()).get('/concepts?q=IA');
    expect(usage.recordList).toHaveBeenCalledWith('meliaf-taxonomy', 'IA', 1);
    await request(app.getHttpServer()).get('/concepts/7');
    expect(usage.record).toHaveBeenCalledWith('meliaf-taxonomy', 'view', 7);
    await request(app.getHttpServer()).get('/export?format=csv');
    expect(usage.record).toHaveBeenCalledWith(
      'meliaf-taxonomy',
      'export',
      'csv',
    );
  });

  it('records nothing when the read itself fails', async () => {
    read.get.mockRejectedValueOnce(new Error('boom'));
    const res = await request(app.getHttpServer()).get('/concepts/9');
    expect(res.status).toBe(500);
    expect(usage.record).not.toHaveBeenCalled();
  });

  it('passes the platform usage period through', async () => {
    await request(app.getHttpServer()).get(
      '/admin/usage/platforms?from=2026-09-01&to=2026-09-30',
    );
    expect(platformUsage.byPlatform).toHaveBeenCalledWith('meliaf-taxonomy', {
      from: '2026-09-01',
      to: '2026-09-30',
      days: undefined,
    });
  });

  describe('optional API key on the public reads', () => {
    const flushFinish = () => new Promise((r) => setImmediate(r));

    it('without X-API-Key: answers as always and checks no key', async () => {
      const res = await request(app.getHttpServer()).get('/concepts/7');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ term_id: 7 });
      expect(res.headers['x-api-key-status']).toBeUndefined();
      expect(apiKeys.validate).not.toHaveBeenCalled();
      expect(usageLog.recordUsageAsync).not.toHaveBeenCalled();
    });

    it('with a valid key: same answer, one usage row, and the read knows its platform', async () => {
      apiKeys.validate.mockResolvedValue({
        valid: true,
        api_key_id: 5,
        mis: { id: 3, name: 'PRMS', acronym: 'PRMS' },
      });
      let seen: unknown = 'not called';
      usage.record.mockImplementationOnce(() => {
        seen = currentApiKeyCaller();
      });
      const res = await request(app.getHttpServer())
        .get('/concepts/7')
        .set('X-API-Key', 'cl_test_abcdefghijklmnop');
      await flushFinish();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ term_id: 7 });
      expect(res.headers['x-api-key-status']).toBeUndefined();
      expect(apiKeys.validate).toHaveBeenCalledWith(
        expect.objectContaining({ api_key: 'cl_test_abcdefghijklmnop' }),
        expect.objectContaining({ recordUsage: false, httpMethod: 'GET' }),
      );
      // Reading public data needs no scope: any valid key counts.
      expect(apiKeys.validate.mock.calls[0][0].required_scope).toBeUndefined();
      expect(usageLog.recordUsageAsync).toHaveBeenCalledTimes(1);
      expect(usageLog.recordUsageAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          api_key_id: 5,
          microservice_name: 'clarisa-api',
          endpoint_accessed: '/concepts/7',
          http_method: 'GET',
          status_code: 200,
        }),
      );
      expect(seen).toEqual({ api_key_id: 5, mis_id: 3 });
    });

    it('with a bad key: still 200, nothing recorded, X-Api-Key-Status: invalid', async () => {
      apiKeys.validate.mockResolvedValue({
        valid: false,
        error: 'API key is revoked',
      });
      const res = await request(app.getHttpServer())
        .get('/concepts?q=IA')
        .set('X-API-Key', 'cl_test_revokedrevokedrev');
      await flushFinish();
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ term_id: 1 }]);
      expect(res.headers['x-api-key-status']).toBe('invalid');
      expect(usageLog.recordUsageAsync).not.toHaveBeenCalled();
      expect(usage.recordList).toHaveBeenCalledWith('meliaf-taxonomy', 'IA', 1);
    });

    it('when the key cannot be checked (database down): still 200, no header, no row', async () => {
      apiKeys.validate.mockRejectedValue(new Error('db down'));
      const res = await request(app.getHttpServer())
        .get('/fields')
        .set('X-API-Key', 'cl_test_abcdefghijklmnop');
      await flushFinish();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ handler: 'read.fields' });
      expect(res.headers['x-api-key-status']).toBeUndefined();
      expect(usageLog.recordUsageAsync).not.toHaveBeenCalled();
    });

    it('when the recorder throws: the read still succeeds', async () => {
      apiKeys.validate.mockResolvedValue({ valid: true, api_key_id: 5 });
      usageLog.recordUsageAsync.mockImplementationOnce(() => {
        throw new Error('log table missing');
      });
      const res = await request(app.getHttpServer())
        .get('/export?format=csv')
        .set('X-API-Key', 'cl_test_abcdefghijklmnop');
      await flushFinish();
      expect(res.status).toBe(200);
      expect(usageLog.recordUsageAsync).toHaveBeenCalledTimes(1);
    });

    it('logs the real status of a failed read made with a valid key', async () => {
      apiKeys.validate.mockResolvedValue({ valid: true, api_key_id: 5 });
      read.get.mockRejectedValueOnce(new Error('boom'));
      const res = await request(app.getHttpServer())
        .get('/concepts/9')
        .set('X-API-Key', 'cl_test_abcdefghijklmnop');
      await flushFinish();
      expect(res.status).toBe(500);
      expect(usageLog.recordUsageAsync).toHaveBeenCalledWith(
        expect.objectContaining({ status_code: 500 }),
      );
    });

    it('never touches the admin routes (they keep their own auth)', async () => {
      apiKeys.validate.mockResolvedValue({ valid: false });
      const res = await request(app.getHttpServer())
        .get('/admin/usage?days=7')
        .set('X-API-Key', 'cl_test_abcdefghijklmnop');
      expect(res.headers['x-api-key-status']).toBeUndefined();
      expect(apiKeys.validate).not.toHaveBeenCalled();
    });
  });
});
