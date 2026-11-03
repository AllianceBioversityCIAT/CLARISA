// LDAPAuth reads src/shared/config/config.ts, which is git-ignored and absent in
// CI; nothing here authenticates (same mock as auth.service.spec).
jest.mock('../../auth/utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));

import {
  ClassSerializerInterceptor,
  HttpStatus,
  INestApplication,
  Module,
  RequestMethod,
} from '@nestjs/common';
import {
  INTERCEPTORS_METADATA,
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
} from '@nestjs/common/constants';
import { APP_FILTER, APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { apiRoutes } from '../api.routes';
import { PUBLIC_OPENAPI_PATHS } from '../../shared/swagger/public-endpoints';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ExceptionsFilter } from '../../shared/filters/exceptions.filter';
import { ResponseFormattingInterceptor } from '../../shared/interceptors/response-formatting.interceptor';
import { Portfolio } from '../portfolio/entities/portfolio.entity';
import { GlossaryPortfolio } from './entities/glossary-portfolio.entity';
import { Glossary, GlossaryEditorialStatus } from './entities/glossary.entity';
import { GlossaryController } from './glossary.controller';
import { GlossaryExportService } from './glossary-export.service';
import { GlossaryModule } from './glossary.module';
import { GlossaryService } from './glossary.service';
import { GlossaryV2Controller } from './glossary-v2.controller';
import { GlossaryV2Module } from './glossary-v2.module';
import { GlossaryRepository } from './repositories/glossary.repository';

/**
 * `GET api/v2/glossary` is the glossary versioned in the URL path (Yeck,
 * 2026-10-29: new versions follow the industry, `/v2/...`; the `?version=N`
 * endpoints migrate later, one by one). Until the taxonomy fields arrive it
 * must answer EXACTLY what `GET api/glossary` answers, so these tests run the
 * same rows through both doors and compare the bytes.
 */

// ---------- rows, hydrated the way TypeORM hands them to the service ----------

const P22 = { id: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22' };
const P25 = { id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' };

type Row = {
  id: string;
  group_id?: string | null;
  title: string;
  definition: string;
  source?: string | null;
  sourceUrl?: string | null;
  referenceDate?: string | null;
  alternative_labels?: string | null;
  editorial_status?: GlossaryEditorialStatus;
  replaced_by_id?: string | null;
  is_active?: boolean;
  portfolios: { id: number; name: string; acronym: string }[];
};

function hydrate(row: Row): Glossary {
  const g = new Glossary();
  g.id = row.id as any;
  g.applicationName = null;
  g.group_id = (row.group_id ?? null) as any;
  g.title = row.title;
  g.definition = row.definition;
  g.source = row.source ?? null;
  g.sourceUrl = row.sourceUrl ?? null;
  g.referenceDate = row.referenceDate ?? null;
  g.alternative_labels = row.alternative_labels ?? null;
  g.editorial_status = row.editorial_status ?? GlossaryEditorialStatus.APPROVED;
  g.replaced_by_id = (row.replaced_by_id ?? null) as any;
  g.show_in_dashboard = false;
  g.glossary_portfolio_array = row.portfolios.map((p) => {
    const portfolio = new Portfolio();
    portfolio.id = p.id;
    portfolio.name = p.name;
    portfolio.acronym = p.acronym;
    const link = new GlossaryPortfolio();
    link.portfolio_id = p.id;
    link.portfolio_object = portfolio;
    link.auditableFields = { is_active: true } as any;
    return link;
  });
  g.auditableFields = { is_active: row.is_active ?? true } as any;
  return g;
}

const ROWS: Glossary[] = [
  hydrate({
    id: '391',
    group_id: '391',
    title: 'Outcome',
    definition: 'A change in knowledge, skills, attitudes or practices.',
    source: 'CGIAR Technical Reporting Arrangement 2025',
    sourceUrl: 'https://cgspace.cgiar.org/items/outcome',
    referenceDate: '2025-03-01',
    alternative_labels: '["Result"]',
    portfolios: [P25],
  }),
  hydrate({
    id: '290',
    title: 'Deliverable',
    definition: 'An output committed in a plan of work.',
    portfolios: [P22, P25],
  }),
  hydrate({
    id: '354',
    title: 'Indicator',
    definition: 'A measure that tracks progress.',
    editorial_status: GlossaryEditorialStatus.DEPRECATED,
    replaced_by_id: '391',
    portfolios: [P25],
  }),
];

const PUBLIC_KEYS = [
  'term',
  'definition',
  'source',
  'sourceUrl',
  'referenceDate',
  'groupId',
  'termId',
  'editorialStatus',
  'replacedByTermId',
  'alternativeLabels',
  'portfolios',
];

/** `(method, path)` of every handler a controller class declares. */
function routesOf(controller: new (...args: any[]) => unknown): string[] {
  return Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => {
      const handler = controller.prototype[name];
      const method = Reflect.getMetadata(METHOD_METADATA, handler);
      const path = Reflect.getMetadata(PATH_METADATA, handler);
      return `${RequestMethod[method]} ${path}`;
    });
}

describe('Glossary v2 in the URL path (api/v2/glossary)', () => {
  describe('where it is mounted', () => {
    it('hangs from api/v2 → glossary in the router, next to the v1 entry', () => {
      const v1 = apiRoutes.find((r) => r.module === GlossaryModule);
      expect(v1?.path).toBe('glossary');

      const v2 = apiRoutes.find((r) => r.path === 'v2');
      expect(v2?.children).toEqual([
        { path: 'glossary', module: GlossaryV2Module },
      ]);
      expect(Reflect.getMetadata(PATH_METADATA, GlossaryV2Controller)).toBe(
        '/',
      );
      expect(
        Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, GlossaryV2Module),
      ).toEqual([GlossaryV2Controller]);
    });

    it('is a plain path, not a @Version decorator: the ?version=N mechanism stays untouched', () => {
      expect(
        Reflect.getMetadata(VERSION_METADATA, GlossaryV2Controller),
      ).toBeUndefined();
      expect(
        Reflect.getMetadata(
          VERSION_METADATA,
          GlossaryV2Controller.prototype.findAll,
        ),
      ).toBeUndefined();
    });

    it('declares only the list for now (dashboard, get/:id, export stay v1-only)', () => {
      expect(routesOf(GlossaryV2Controller)).toEqual(['GET /']);
      // v1 keeps its five routes (their order is v1's own contract).
      expect([...routesOf(GlossaryController)].sort()).toEqual([
        'GET /',
        'GET /dashboard',
        'GET export',
        'GET get/:id',
        'PATCH update',
      ]);
    });

    it('serialises through ClassSerializerInterceptor, like v1', () => {
      expect(
        Reflect.getMetadata(INTERCEPTORS_METADATA, GlossaryV2Controller),
      ).toEqual([ClassSerializerInterceptor]);
    });

    it('is public in the OpenAPI allow-list, next to v1', () => {
      expect(PUBLIC_OPENAPI_PATHS.filter((p) => /glossary/.test(p))).toEqual([
        '/api/glossary',
        '/api/v2/glossary',
      ]);
    });

    it('reads through the same service and repository as v1', () => {
      expect(
        Reflect.getMetadata(MODULE_METADATA.PROVIDERS, GlossaryV2Module),
      ).toEqual([GlossaryService, GlossaryRepository]);
      expect(
        Reflect.getMetadata(MODULE_METADATA.PROVIDERS, GlossaryModule),
      ).toEqual(expect.arrayContaining([GlossaryService, GlossaryRepository]));
    });
  });

  describe('the v2 module stands on its own', () => {
    it('builds GlossaryService with what the module declares (nothing missing at boot)', async () => {
      const repository = { find: jest.fn().mockResolvedValue(ROWS) };
      const moduleRef = await Test.createTestingModule({
        imports: [GlossaryV2Module],
      })
        // The repository needs a live DataSource; everything else is real.
        .overrideProvider(GlossaryRepository)
        .useValue(repository)
        .compile();

      const service = moduleRef.get(GlossaryService);
      expect(service).toBeInstanceOf(GlossaryService);
      await expect(service.findAll(undefined)).resolves.toBe(ROWS);
      expect(moduleRef.get(GlossaryV2Controller)).toBeInstanceOf(
        GlossaryV2Controller,
      );
      await moduleRef.close();
    });
  });

  describe('over HTTP, v1 and v2 side by side with the production filter and interceptors', () => {
    let app: INestApplication;
    const service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    const exporter = { export: jest.fn() };

    @Module({
      controllers: [GlossaryController],
      providers: [
        { provide: GlossaryService, useValue: service },
        { provide: GlossaryExportService, useValue: exporter },
      ],
    })
    class V1 {}

    @Module({
      controllers: [GlossaryV2Controller],
      providers: [{ provide: GlossaryService, useValue: service }],
    })
    class V2 {}

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          V1,
          V2,
          // The same tree `routes.ts` + `api.routes.ts` build in production.
          RouterModule.register([
            {
              path: 'api',
              children: [
                { path: 'glossary', module: V1 },
                { path: 'v2', children: [{ path: 'glossary', module: V2 }] },
              ],
            },
          ]),
        ],
        providers: [
          { provide: APP_FILTER, useClass: ExceptionsFilter },
          { provide: APP_INTERCEPTOR, useClass: ResponseFormattingInterceptor },
        ],
      }).compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      jest.clearAllMocks();
      service.findAll.mockResolvedValue(ROWS);
    });

    const get = (path: string) => request(app.getHttpServer()).get(path);

    it('GET api/v2/glossary answers the published list with the eleven v1 keys', async () => {
      const res = await get('/api/v2/glossary');
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.headers['content-type']).toMatch(/^application\/json/);
      expect(res.body).toHaveLength(3);
      for (const term of res.body) {
        expect(Object.keys(term)).toEqual(PUBLIC_KEYS);
      }
      expect(res.body[0]).toEqual({
        term: 'Outcome',
        definition: 'A change in knowledge, skills, attitudes or practices.',
        source: 'CGIAR Technical Reporting Arrangement 2025',
        sourceUrl: 'https://cgspace.cgiar.org/items/outcome',
        referenceDate: '2025-03-01',
        groupId: 391,
        termId: 391,
        editorialStatus: 'approved',
        replacedByTermId: null,
        alternativeLabels: ['Result'],
        portfolios: [{ id: 3, name: P25.name, acronym: 'P25' }],
      });
    });

    it.each([
      ['', undefined],
      ['?show=active', FindAllOptions.SHOW_ONLY_ACTIVE],
      ['?show=all', FindAllOptions.SHOW_ALL],
      ['?show=inactive', FindAllOptions.SHOW_ONLY_INACTIVE],
    ])(
      'GET api/v2/glossary%s answers byte-identical to GET api/glossary with the same query',
      async (query, expected) => {
        const v1 = await get(`/api/glossary${query}`);
        const v2 = await get(`/api/v2/glossary${query}`);

        expect(v1.status).toBe(HttpStatus.OK);
        expect(v2.status).toBe(HttpStatus.OK);
        expect(v2.text).toBe(v1.text);
        expect(v2.headers['content-type']).toBe(v1.headers['content-type']);

        // Both doors ask the service exactly the same thing.
        expect(service.findAll).toHaveBeenCalledTimes(2);
        expect(service.findAll).toHaveBeenNthCalledWith(1, expected);
        expect(service.findAll).toHaveBeenNthCalledWith(2, expected);
      },
    );

    it('answers an empty list the same way through both doors', async () => {
      service.findAll.mockResolvedValue([]);
      const v1 = await get('/api/glossary');
      const v2 = await get('/api/v2/glossary');
      expect(v2.text).toBe(v1.text);
      expect(v2.body).toEqual([]);
    });

    it('?version=2 on either door changes nothing (the path is the version)', async () => {
      const plain = await get('/api/v2/glossary');
      const withParam = await get('/api/v2/glossary?version=2');
      const v1WithParam = await get('/api/glossary?version=2');
      expect(withParam.text).toBe(plain.text);
      expect(v1WithParam.text).toBe(plain.text);
      // `version` is never forwarded as the `show` filter.
      expect(service.findAll).toHaveBeenCalledTimes(3);
      expect(service.findAll).toHaveBeenNthCalledWith(2, undefined);
      expect(service.findAll).toHaveBeenNthCalledWith(3, undefined);
    });

    it('does not expose the v1-only routes under v2', async () => {
      for (const path of [
        '/api/v2/glossary/dashboard',
        '/api/v2/glossary/get/391',
        '/api/v2/glossary/export',
      ]) {
        const res = await get(path);
        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      }
      expect(service.findAll).not.toHaveBeenCalled();
    });

    it('turns a service failure into the same error envelope as v1', async () => {
      service.findAll.mockRejectedValue(new Error('?!'));
      const v1 = await get('/api/glossary');
      const v2 = await get('/api/v2/glossary');
      expect(v2.status).toBe(v1.status);
      expect(Object.keys(v2.body)).toEqual(Object.keys(v1.body));
      expect({ ...v2.body, date: null, path: null }).toEqual({
        ...v1.body,
        date: null,
        path: null,
      });
      expect(v2.body.path).toBe('/api/v2/glossary');
    });
  });
});
