// LDAPAuth reads src/shared/config/config.ts, which is git-ignored and absent in
// CI; nothing here authenticates (same mock as auth.service.spec).
jest.mock('../../auth/utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));

import {
  ClassSerializerInterceptor,
  Global,
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
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { DataSource } from 'typeorm';
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
import { GLOSSARY_STORAGE, GlossaryStore } from './glossary-store';
import { InMemoryGlossaryStore } from './testing/in-memory-glossary-store';
import {
  GlossaryTaxonomyLink,
  GlossaryTaxonomyLinksService,
} from './glossary-taxonomy-links.service';

/**
 * `GET api/v2/glossary` is the glossary versioned in the URL path (Yeck,
 * 2026-10-29: new versions follow the industry, `/v2/...`; the `?version=N`
 * endpoints migrate later, one by one). It answers EXACTLY what
 * `GET api/glossary` answers plus two keys from the taxonomy at the end of
 * each term (`termUri`, `taxonomyStatus`), so these tests run the same rows
 * through both doors and compare the bytes once those two keys are removed.
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

/** v2 = the v1 keys, in v1's order, then what the taxonomy adds. */
const V2_KEYS = [...PUBLIC_KEYS, 'termUri', 'taxonomyStatus'];

/** Taxonomy copy as of the fixtures: 391 approved, 354 deprecated, 290 absent. */
const LINKS = new Map<number, GlossaryTaxonomyLink>([
  [
    391,
    {
      termUri: 'https://api.clarisa.cgiar.org/meliaf-taxonomy/391',
      taxonomyStatus: 'approved' as any,
    },
  ],
  [
    354,
    {
      termUri: 'https://api.clarisa.cgiar.org/meliaf-taxonomy/354',
      taxonomyStatus: 'deprecated' as any,
    },
  ],
]);

/** A v2 body with the taxonomy keys removed, re-serialised like v1. */
function withoutTaxonomyKeys(body: Record<string, unknown>[]): string {
  return JSON.stringify(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    body.map(({ termUri, taxonomyStatus, ...v1 }) => v1),
  );
}

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

    it('reads through the same service and store as v1, plus the taxonomy links', () => {
      const store = { provide: GLOSSARY_STORAGE, useClass: GlossaryStore };
      expect(
        Reflect.getMetadata(MODULE_METADATA.PROVIDERS, GlossaryV2Module),
      ).toEqual([GlossaryService, store, GlossaryTaxonomyLinksService]);
      expect(
        Reflect.getMetadata(MODULE_METADATA.PROVIDERS, GlossaryModule),
      ).toEqual(expect.arrayContaining([GlossaryService, store]));
    });
  });

  describe('the v2 module stands on its own', () => {
    it('builds GlossaryService with what the module declares (nothing missing at boot)', async () => {
      const store = new InMemoryGlossaryStore(ROWS);
      // In production TypeOrmModule.forRoot provides the DataSource globally.
      @Global()
      @Module({
        providers: [{ provide: DataSource, useValue: { query: jest.fn() } }],
        exports: [DataSource],
      })
      class Db {}
      const moduleRef = await Test.createTestingModule({
        imports: [Db, GlossaryV2Module],
      })
        // The store needs a live DataSource; everything else is real.
        .overrideProvider(GLOSSARY_STORAGE)
        .useValue(store)
        .compile();

      const service = moduleRef.get(GlossaryService);
      expect(service).toBeInstanceOf(GlossaryService);
      await expect(service.findAll(undefined)).resolves.toEqual(
        (await store.all()).filter((g) => g.auditableFields?.is_active),
      );
      expect(moduleRef.get(GlossaryV2Controller)).toBeInstanceOf(
        GlossaryV2Controller,
      );
      expect(moduleRef.get(GlossaryTaxonomyLinksService)).toBeInstanceOf(
        GlossaryTaxonomyLinksService,
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
    const links = { linksForOrEmpty: jest.fn() };

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
      providers: [
        { provide: GlossaryService, useValue: service },
        { provide: GlossaryTaxonomyLinksService, useValue: links },
      ],
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
      links.linksForOrEmpty.mockResolvedValue(LINKS);
    });

    const get = (path: string) => request(app.getHttpServer()).get(path);

    it('GET api/v2/glossary answers the eleven v1 keys, then termUri and taxonomyStatus', async () => {
      const res = await get('/api/v2/glossary');
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.headers['content-type']).toMatch(/^application\/json/);
      expect(res.body).toHaveLength(3);
      for (const term of res.body) {
        expect(Object.keys(term)).toEqual(V2_KEYS);
      }
      // One lookup for the whole page, by glossary id (= taxonomy term_id).
      expect(links.linksForOrEmpty).toHaveBeenCalledTimes(1);
      expect(links.linksForOrEmpty).toHaveBeenCalledWith([391, 290, 354]);
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
        termUri: 'https://api.clarisa.cgiar.org/meliaf-taxonomy/391',
        taxonomyStatus: 'approved',
      });
      // A term created after the copy is not in the taxonomy: nulls, not absent.
      expect(res.body[1].termId).toBe(290);
      expect(res.body[1].termUri).toBeNull();
      expect(res.body[1].taxonomyStatus).toBeNull();
      expect(res.body[2].taxonomyStatus).toBe('deprecated');
    });

    it('a taxonomy that answers nothing leaves every term with null links, nothing else changes', async () => {
      links.linksForOrEmpty.mockResolvedValue(new Map());
      const v1 = await get('/api/glossary');
      const v2 = await get('/api/v2/glossary');
      expect(v2.status).toBe(HttpStatus.OK);
      for (const term of v2.body) {
        expect(term.termUri).toBeNull();
        expect(term.taxonomyStatus).toBeNull();
      }
      expect(withoutTaxonomyKeys(v2.body)).toBe(v1.text);
    });

    it.each([
      ['', undefined],
      ['?show=active', FindAllOptions.SHOW_ONLY_ACTIVE],
      ['?show=all', FindAllOptions.SHOW_ALL],
      ['?show=inactive', FindAllOptions.SHOW_ONLY_INACTIVE],
    ])(
      'GET api/v2/glossary%s, without the taxonomy keys, is byte-identical to GET api/glossary with the same query',
      async (query, expected) => {
        const v1 = await get(`/api/glossary${query}`);
        const v2 = await get(`/api/v2/glossary${query}`);

        expect(v1.status).toBe(HttpStatus.OK);
        expect(v2.status).toBe(HttpStatus.OK);
        expect(withoutTaxonomyKeys(v2.body)).toBe(v1.text);
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
      expect(links.linksForOrEmpty).toHaveBeenCalledWith([]);
    });

    it('?version=2 on either door changes nothing (the path is the version)', async () => {
      const plain = await get('/api/v2/glossary');
      const withParam = await get('/api/v2/glossary?version=2');
      const v1WithParam = await get('/api/glossary?version=2');
      expect(withParam.text).toBe(plain.text);
      expect(v1WithParam.text).toBe(withoutTaxonomyKeys(plain.body));
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

  describe('invalid ?show= on api/v2/glossary, with the real service (2026-11-11)', () => {
    let app: INestApplication;
    const store = new InMemoryGlossaryStore(ROWS);
    const links = { linksForOrEmpty: jest.fn(async () => new Map()) };

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [GlossaryV2Controller],
        providers: [
          GlossaryService,
          { provide: GLOSSARY_STORAGE, useValue: store },
          { provide: GlossaryTaxonomyLinksService, useValue: links },
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

    it.each([
      ['?show=foo', 'foo'],
      ['?show=', ''],
      ['?show=ALL', 'ALL'],
      ['?show=a&show=b', 'a,b'],
    ])(
      '%s is a 400 naming the accepted values (it was a 500)',
      async (q, v) => {
        const res = await request(app.getHttpServer()).get(`/${q}`);
        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.status).toBe(400);
        expect(res.body.message).toBe(
          `Unknown show value "${v}". Use all, active or inactive.`,
        );
        expect(links.linksForOrEmpty).not.toHaveBeenCalled();
      },
    );

    it('a valid ?show= still answers 200', async () => {
      const res = await request(app.getHttpServer()).get('/?show=all');
      expect(res.status).toBe(HttpStatus.OK);
    });
  });

  describe('what the public Swagger decorators of v2 say (2026-11-11)', () => {
    const proto = GlossaryV2Controller.prototype;

    it('keeps its summary', () => {
      const op = Reflect.getMetadata(DECORATORS.API_OPERATION, proto.findAll);
      expect(op.summary).toBe('List glossary terms (v2)');
    });

    it('names every returned field, and never the product name of the taxonomy', () => {
      const op = Reflect.getMetadata(DECORATORS.API_OPERATION, proto.findAll);
      expect(op.description).toBe(
        'Version 2 of the glossary, versioned in the URL path: api/glossary ' +
          'keeps serving v1 unchanged and api/v2/glossary is where the glossary ' +
          'grows from now on. v2 answers the same terms and keys as v1, plus ' +
          '"termUri" (the persistent URI of the term) and "taxonomyStatus" (the ' +
          'status of the term in the taxonomy: "approved" or "deprecated"), both ' +
          'null when the term has no public concept. ' +
          'Each term carries "term", "definition", "termId" (its permanent ' +
          'identifier), "groupId" (shared by every entry of the same concept: a ' +
          'term whose meaning changed between portfolios is published once per ' +
          'version), "alternativeLabels" (other names readers use for it; an ' +
          'empty list when there are none), "editorialStatus" ("approved" or ' +
          '"deprecated"), "replacedByTermId" (the "termId" of the term that ' +
          'replaces it, or null), a "portfolios" array with the CGIAR portfolios ' +
          '(id, name, acronym) the term belongs to, and its provenance: ' +
          '"source", "sourceUrl" and "referenceDate" (YYYY-MM-DD), null while a ' +
          'definition has not been attributed yet. ' +
          'Drafts and terms under review are never listed.',
      );
      expect(op.description).not.toMatch(/MELIAF/i);
      for (const key of V2_KEYS) expect(op.description).toContain(`"${key}"`);
    });

    it('documents ?show with its three values and what any other value does', () => {
      expect(
        Reflect.getMetadata(DECORATORS.API_PARAMETERS, proto.findAll),
      ).toEqual([
        {
          name: 'show',
          required: false,
          in: 'query',
          description:
            "Filter by status: 'all', 'active' (default) or 'inactive'. Any other " +
            'value (empty, repeated or in another case) answers 400. Drafts and ' +
            'terms under review never appear, whatever the value.',
          schema: { enum: ['all', 'active', 'inactive'], type: 'string' },
        },
      ]);
    });
  });
});
