// LDAPAuth reads src/shared/config/config.ts, which is git-ignored and absent in
// CI; nothing here authenticates (same mock as auth.service.spec).
jest.mock('../../auth/utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));

import {
  HttpStatus,
  INestApplication,
  RequestMethod,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  INTERCEPTORS_METADATA,
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { instanceToPlain } from 'class-transformer';
import request from 'supertest';
import { In } from 'typeorm';
import { apiRoutes } from '../api.routes';
import { PUBLIC_OPENAPI_PATHS } from '../../shared/swagger/public-endpoints';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ExceptionsFilter } from '../../shared/filters/exceptions.filter';
import { ResponseFormattingInterceptor } from '../../shared/interceptors/response-formatting.interceptor';
import { Portfolio } from '../portfolio/entities/portfolio.entity';
import {
  Glossary,
  GlossaryEditorialStatus,
  PUBLISHED_EDITORIAL_STATUSES,
} from './entities/glossary.entity';
import { GlossaryPortfolio } from './entities/glossary-portfolio.entity';
import { GlossaryController } from './glossary.controller';
import { GlossaryAdminController } from './glossary-admin.controller';
import {
  GLOSSARY_SCHEME_URI,
  GLOSSARY_TERM_URI_BASE,
  GlossaryExportFormat,
  GlossaryExportService,
} from './glossary-export.service';
import { GlossaryModule } from './glossary.module';
import { GlossaryService } from './glossary.service';

/**
 * The PUBLIC CONTRACT of the glossary, pinned exactly as production answers it
 * on 2026-10-28 (api.clarisa.cgiar.org, 81 terms).
 *
 * Why this file exists (Yeck, 2026-10-28): the glossary has been consumed
 * since 2022 — PRMS, MEL, MARLO and the public page integrate against these
 * exact routes and keys — and it is about to be extended with the MELIAF
 * taxonomy capabilities. Every change from now on must keep answering what is
 * pinned here, unchanged; a new shape goes under a new version or a new
 * resource, never by moving these. A red test in this file means a consumer
 * would break, not that the test is outdated.
 *
 * The rows are real production records (public data), hydrated the way
 * TypeORM hands them to the service: every column present, `null` where the
 * database holds `NULL`, bigints as strings.
 */

// ---------- production rows, as TypeORM would hydrate them ----------

type Row = {
  id: string;
  group_id: string | null;
  title: string;
  definition: string;
  source?: string | null;
  sourceUrl?: string | null;
  referenceDate?: string | null;
  alternative_labels?: string | null;
  editorial_status?: GlossaryEditorialStatus;
  replaced_by_id?: string | null;
  show_in_dashboard?: boolean;
  portfolios: { id: number; name: string; acronym: string; active?: boolean }[];
};

const P22 = { id: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22' };
const P25 = { id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' };

/** Builds the entity in column order, which is the key order a consumer sees. */
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
  g.show_in_dashboard = row.show_in_dashboard ?? false;
  g.glossary_portfolio_array = row.portfolios.map((p) => {
    const portfolio = new Portfolio();
    portfolio.id = p.id;
    portfolio.name = p.name;
    portfolio.acronym = p.acronym;
    const link = new GlossaryPortfolio();
    link.glossary_id = row.id as any;
    link.portfolio_id = p.id;
    link.portfolio_object = portfolio;
    link.auditableFields = {
      is_active: p.active ?? true,
      created_by: 1,
    } as any;
    return link;
  });
  g.auditableFields = {
    created_at: new Date('2022-08-04T00:00:00Z'),
    updated_at: new Date('2026-09-25T00:00:00Z'),
    is_active: true,
    created_by: 1,
    updated_by: null,
    modification_justification: null,
  } as any;
  return g;
}

/** `GET api/glossary` → entry for termId 391 (verbatim from production). */
const OUTCOME_2030 = hydrate({
  id: '391',
  group_id: null,
  title: '2030 outcome',
  definition:
    '2030 outcomes are the final, highest-level outcomes to be achieved by the end of 2030 by the Programs/Accelerators/Projects. It is expected that these 2030 outcomes would lead to measurable impacts.',
  portfolios: [P25],
});

/** termId 290: one entry, two portfolios. */
const INDICATOR = hydrate({
  id: '290',
  group_id: null,
  title: 'Indicator',
  definition:
    'Is a standardized measurement that provides evidence or information on progress or change toward achieving specific targets or goals used to trace and compare results, monitor trends, identify areas for action across impact pathways over time and across contexts.',
  portfolios: [P22, P25],
});

/** termId 354: a version of concept 42 (`groupId` differs from `termId`). */
const DELIVERABLE_P25 = hydrate({
  id: '354',
  group_id: '42',
  title: 'Deliverable',
  definition:
    'The outputs to be achieved by teams working on PODs. Deliverables are defined on an annual basis using the standard result types (Knowledge Products, Innovation Development, Capacity Sharing, or Other). Deliverables are “bought” by P/As annually, and form the basis for the P/A’s Plan of Results and Budget (PORB) and annual reporting.',
  portfolios: [P25],
});

/** What production publishes for those three rows, byte for byte. */
const PUBLISHED = {
  outcome2030: {
    term: '2030 outcome',
    definition:
      '2030 outcomes are the final, highest-level outcomes to be achieved by the end of 2030 by the Programs/Accelerators/Projects. It is expected that these 2030 outcomes would lead to measurable impacts.',
    source: null,
    sourceUrl: null,
    referenceDate: null,
    groupId: 391,
    termId: 391,
    editorialStatus: 'approved',
    replacedByTermId: null,
    alternativeLabels: [],
    portfolios: [{ id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' }],
  },
  indicator: {
    term: 'Indicator',
    definition:
      'Is a standardized measurement that provides evidence or information on progress or change toward achieving specific targets or goals used to trace and compare results, monitor trends, identify areas for action across impact pathways over time and across contexts.',
    source: null,
    sourceUrl: null,
    referenceDate: null,
    groupId: 290,
    termId: 290,
    editorialStatus: 'approved',
    replacedByTermId: null,
    alternativeLabels: [],
    portfolios: [
      { id: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22' },
      { id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' },
    ],
  },
  deliverableP25: {
    term: 'Deliverable',
    definition:
      'The outputs to be achieved by teams working on PODs. Deliverables are defined on an annual basis using the standard result types (Knowledge Products, Innovation Development, Capacity Sharing, or Other). Deliverables are “bought” by P/As annually, and form the basis for the P/A’s Plan of Results and Budget (PORB) and annual reporting.',
    source: null,
    sourceUrl: null,
    referenceDate: null,
    groupId: 42,
    termId: 354,
    editorialStatus: 'approved',
    replacedByTermId: null,
    alternativeLabels: [],
    portfolios: [{ id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' }],
  },
};

/** The keys of one published term, in the order production sends them. */
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
function routesOf(controller: any): string[] {
  const proto = controller.prototype;
  return Object.getOwnPropertyNames(proto)
    .filter((name) => name !== 'constructor')
    .map((name) => {
      const path = Reflect.getMetadata(PATH_METADATA, proto[name]);
      const method = Reflect.getMetadata(METHOD_METADATA, proto[name]);
      return path === undefined ? null : `${RequestMethod[method]} ${path}`;
    })
    .filter((route): route is string => route !== null)
    .sort();
}

describe('Glossary public contract (as production answers it)', () => {
  describe('where it is mounted', () => {
    it('lives at api/glossary, and the admin controller is registered first', () => {
      const entry = apiRoutes.find((r) => r.module === GlossaryModule);
      expect(entry?.path).toBe('glossary');
      expect(Reflect.getMetadata(PATH_METADATA, GlossaryController)).toBe('/');
      expect(Reflect.getMetadata(PATH_METADATA, GlossaryAdminController)).toBe(
        'admin',
      );
      // `admin/...` must be matched before `get/:id`-style public routes.
      expect(
        Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, GlossaryModule),
      ).toEqual([GlossaryAdminController, GlossaryController]);
    });

    it('is in the public OpenAPI allow-list, and only a path-versioned twin may join it', () => {
      // `/api/v2/glossary` arrives with feat/glossary-v2-path (Yeck,
      // 2026-10-29: new versions travel in the URL path). Anything else named
      // glossary in the allow-list is a leak.
      const glossaryPaths = PUBLIC_OPENAPI_PATHS.filter((p) =>
        /glossary/.test(p),
      );
      expect(glossaryPaths[0]).toBe('/api/glossary');
      expect(
        glossaryPaths.every((p) => /^\/api\/(v\d+\/)?glossary$/.test(p)),
      ).toBe(true);
    });

    it('declares exactly these public routes', () => {
      expect(routesOf(GlossaryController)).toEqual([
        'GET /',
        'GET /dashboard',
        'GET export',
        'GET get/:id',
        'PATCH update',
      ]);
    });

    it('serialises every public response through ClassSerializerInterceptor', () => {
      // The keys below only exist because of it: without the interceptor the
      // raw columns (title, group_id, …) would leak and the getters would not.
      expect(
        Reflect.getMetadata(INTERCEPTORS_METADATA, GlossaryController),
      ).toEqual([ClassSerializerInterceptor]);
    });
  });

  describe('vocabulary the consumers send and receive', () => {
    it('accepts show=all | active | inactive, nothing else', () => {
      expect(Object.values(FindAllOptions)).toEqual([
        'all',
        'active',
        'inactive',
      ]);
    });

    it('publishes approved and deprecated terms, hides draft and in_review', () => {
      expect(Object.values(GlossaryEditorialStatus)).toEqual([
        'draft',
        'in_review',
        'approved',
        'deprecated',
      ]);
      expect(PUBLISHED_EDITORIAL_STATUSES).toEqual(['approved', 'deprecated']);
    });

    it('offers json, csv and skos as export formats', () => {
      expect(Object.values(GlossaryExportFormat)).toEqual([
        'json',
        'csv',
        'skos',
      ]);
    });

    it('keeps the persistent URI of a term on clarisa.cgiar.org/glossary/term/', () => {
      expect(GLOSSARY_SCHEME_URI).toBe('https://clarisa.cgiar.org/glossary');
      expect(GLOSSARY_TERM_URI_BASE).toBe(
        'https://clarisa.cgiar.org/glossary/term/',
      );
    });
  });

  describe('shape of one published term', () => {
    it('is exactly these eleven keys, in this order', () => {
      expect(Object.keys(instanceToPlain(OUTCOME_2030))).toEqual(PUBLIC_KEYS);
    });

    it('matches production for a term with one portfolio', () => {
      expect(instanceToPlain(OUTCOME_2030)).toEqual(PUBLISHED.outcome2030);
    });

    it('matches production for a term with two portfolios', () => {
      expect(instanceToPlain(INDICATOR)).toEqual(PUBLISHED.indicator);
    });

    it('matches production for a version of a concept (groupId ≠ termId)', () => {
      expect(instanceToPlain(DELIVERABLE_P25)).toEqual(
        PUBLISHED.deliverableP25,
      );
    });

    it('publishes the three provenance keys as null, present, never missing', () => {
      const plain = instanceToPlain(OUTCOME_2030);
      for (const key of ['source', 'sourceUrl', 'referenceDate']) {
        expect(key in plain).toBe(true);
        expect(plain[key]).toBeNull();
      }
    });

    it('publishes ids as numbers although the database hands them as strings', () => {
      const plain = instanceToPlain(DELIVERABLE_P25);
      expect(typeof plain.termId).toBe('number');
      expect(typeof plain.groupId).toBe('number');
      expect(plain.portfolios.every((p) => typeof p.id === 'number')).toBe(
        true,
      );
    });

    it('never leaks a column name, an internal flag or an audit field', () => {
      const plain = instanceToPlain(OUTCOME_2030);
      for (const hidden of [
        'id',
        'applicationName',
        'group_id',
        'title',
        'source_url',
        'reference_date',
        'alternative_labels',
        'editorial_status',
        'replaced_by_id',
        'show_in_dashboard',
        'glossary_portfolio_array',
        'auditableFields',
        'created_at',
        'updated_at',
        'is_active',
        'created_by',
      ]) {
        expect(plain[hidden]).toBeUndefined();
      }
    });

    it('fills every optional key when the row has the data', () => {
      const full = hydrate({
        id: '500',
        group_id: '42',
        title: 'Impact assessment',
        definition: 'A definition.',
        source: 'CGIAR 2025-2030 Portfolio Narrative',
        sourceUrl: 'https://www.cgiar.org/',
        referenceDate: '2025-01-15',
        alternative_labels: '["IA", "impact evaluation"]',
        editorial_status: GlossaryEditorialStatus.DEPRECATED,
        replaced_by_id: '501',
        portfolios: [P22, { ...P25, active: false }],
      });
      expect(instanceToPlain(full)).toEqual({
        term: 'Impact assessment',
        definition: 'A definition.',
        source: 'CGIAR 2025-2030 Portfolio Narrative',
        sourceUrl: 'https://www.cgiar.org/',
        referenceDate: '2025-01-15',
        groupId: 42,
        termId: 500,
        editorialStatus: 'deprecated',
        replacedByTermId: 501,
        alternativeLabels: ['IA', 'impact evaluation'],
        // An inactive association is not published.
        portfolios: [
          { id: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22' },
        ],
      });
    });
  });

  describe('what the service asks the database', () => {
    let service: GlossaryService;
    let repository: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock };

    const published = { editorial_status: In(PUBLISHED_EDITORIAL_STATUSES) };
    const order = { title: 'ASC' };
    const relations = { glossary_portfolio_array: { portfolio_object: true } };

    beforeEach(() => {
      repository = {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      };
      service = new GlossaryService(repository as any);
    });

    it('GET api/glossary (no show) = active, published, by term, with portfolios', async () => {
      await service.findAll(undefined);
      expect(repository.find).toHaveBeenCalledWith({
        where: { ...published, auditableFields: { is_active: true } },
        order,
        relations,
      });
    });

    it('show=inactive flips only the active flag', async () => {
      await service.findAll(FindAllOptions.SHOW_ONLY_INACTIVE);
      expect(repository.find).toHaveBeenCalledWith({
        where: { ...published, auditableFields: { is_active: false } },
        order,
        relations,
      });
    });

    it('show=all drops the active filter but still hides drafts', async () => {
      await service.findAll(FindAllOptions.SHOW_ALL);
      expect(repository.find).toHaveBeenCalledWith({
        where: published,
        order,
        relations,
      });
    });

    it('dashboard adds show_in_dashboard on top of the same filters', async () => {
      await service.findAll(undefined, true);
      expect(repository.find).toHaveBeenCalledWith({
        where: {
          ...published,
          show_in_dashboard: true,
          auditableFields: { is_active: true },
        },
        order,
        relations,
      });
    });

    it('get/:id reads one published row with its portfolios', async () => {
      await service.findOne(391);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 391, ...published },
        relations,
      });
    });

    it('update saves the payload as it comes', async () => {
      const payload = [{ id: 391, definition: 'edited' }];
      repository.save.mockResolvedValue(payload);
      await expect(service.update(payload as any)).resolves.toBe(payload);
      expect(repository.save).toHaveBeenCalledWith(payload);
    });
  });

  describe('over HTTP, with the production filter and interceptors', () => {
    let app: INestApplication;
    const service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    const exporter = { export: jest.fn() };

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [GlossaryController],
        providers: [
          { provide: GlossaryService, useValue: service },
          { provide: GlossaryExportService, useValue: exporter },
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
      service.findAll.mockResolvedValue([
        OUTCOME_2030,
        DELIVERABLE_P25,
        INDICATOR,
      ]);
      service.findOne.mockResolvedValue(OUTCOME_2030);
      service.update.mockImplementation(async (rows) => rows);
      exporter.export.mockResolvedValue({
        body: '[]',
        contentType: 'application/json; charset=utf-8',
        fileName: 'clarisa-glossary-2026-10-28.json',
      });
    });

    it('GET / answers the published list, in the order the service gives it', async () => {
      const res = await request(app.getHttpServer()).get('/');
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.headers['content-type']).toMatch(/^application\/json/);
      expect(res.body).toEqual([
        PUBLISHED.outcome2030,
        PUBLISHED.deliverableP25,
        PUBLISHED.indicator,
      ]);
      expect(Object.keys(res.body[0])).toEqual(PUBLIC_KEYS);
      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });

    it('GET /?show=all passes the option through untouched', async () => {
      await request(app.getHttpServer()).get('/?show=all');
      expect(service.findAll).toHaveBeenCalledWith('all');
    });

    it('GET /dashboard is the same list restricted to the dashboard', async () => {
      const res = await request(app.getHttpServer()).get(
        '/dashboard?show=active',
      );
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body[0]).toEqual(PUBLISHED.outcome2030);
      expect(service.findAll).toHaveBeenCalledWith('active', true);
    });

    it('GET /get/:id answers one published term', async () => {
      const res = await request(app.getHttpServer()).get('/get/391');
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toEqual(PUBLISHED.outcome2030);
      expect(service.findOne).toHaveBeenCalledWith(391);
    });

    it('GET /get/:id with a non-numeric id is a 400 in the production envelope', async () => {
      const res = await request(app.getHttpServer()).get('/get/abc');
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(Object.keys(res.body)).toEqual([
        'response',
        'message',
        'status',
        'date',
        'path',
      ]);
      expect(res.body.status).toBe(400);
      expect(res.body.path).toBe('/get/abc');
      expect(service.findOne).not.toHaveBeenCalled();
    });

    it('GET /get/:id of an unknown or unpublished term is 200 with an empty body (as today)', async () => {
      // Pinned as it is, not as it should be: a consumer gets no 404 today.
      service.findOne.mockResolvedValue(null);
      const res = await request(app.getHttpServer()).get('/get/999999');
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.text).toBe('');
    });

    it('GET /export defaults to json and serves the file as an attachment', async () => {
      const res = await request(app.getHttpServer()).get('/export');
      expect(res.status).toBe(HttpStatus.OK);
      expect(exporter.export).toHaveBeenCalledWith('json');
      expect(res.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="clarisa-glossary-2026-10-28.json"',
      );
      expect(res.text).toBe('[]');
    });

    it('GET /export?format=CSV is accepted whatever the case', async () => {
      exporter.export.mockResolvedValue({
        body: '﻿termId\r\n',
        contentType: 'text/csv; charset=utf-8',
        fileName: 'clarisa-glossary-2026-10-28.csv',
      });
      const res = await request(app.getHttpServer()).get('/export?format=CSV');
      expect(res.status).toBe(HttpStatus.OK);
      expect(exporter.export).toHaveBeenCalledWith('csv');
      expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="clarisa-glossary-2026-10-28.csv"',
      );
    });

    it('GET /export?format=xml is a 400 that names the three formats', async () => {
      const res = await request(app.getHttpServer()).get('/export?format=xml');
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(res.body.status).toBe(400);
      expect(res.body.message).toBe(
        'Unknown export format "xml". Use json, csv or skos.',
      );
      expect(exporter.export).not.toHaveBeenCalled();
    });

    it('PATCH /update saves the list and echoes what was saved, raw', async () => {
      // `@Res()` bypasses the serializer on purpose: the response is exactly
      // what the repository returned, `id` included.
      const payload = [{ id: 391, definition: 'edited' }];
      const res = await request(app.getHttpServer())
        .patch('/update')
        .send(payload);
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toEqual(payload);
      expect(service.update).toHaveBeenCalledWith(payload);
    });

    it('PATCH /update turns a service failure into a 400 with its message', async () => {
      service.update.mockRejectedValue(new Error('duplicate term'));
      const res = await request(app.getHttpServer())
        .patch('/update')
        .send([{ id: 1 }]);
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(res.body.status).toBe(400);
      expect(res.body.message).toBe('duplicate term');
    });
  });

  describe('export files, built from the same rows', () => {
    const service = { findAll: jest.fn() } as unknown as GlossaryService;
    const exporter = new GlossaryExportService(service);
    const day = new Date().toISOString().slice(0, 10);

    beforeEach(() => {
      (service.findAll as jest.Mock).mockResolvedValue([
        OUTCOME_2030,
        DELIVERABLE_P25,
      ]);
    });

    it('json carries exactly the public keys, nothing more', async () => {
      const file = await exporter.export(GlossaryExportFormat.JSON);
      expect(file.contentType).toBe('application/json; charset=utf-8');
      expect(file.fileName).toBe(`clarisa-glossary-${day}.json`);
      expect(JSON.parse(file.body)).toEqual([
        PUBLISHED.outcome2030,
        PUBLISHED.deliverableP25,
      ]);
    });

    it('csv keeps this header, this column order, the BOM and CRLF', async () => {
      const file = await exporter.export(GlossaryExportFormat.CSV);
      expect(file.contentType).toBe('text/csv; charset=utf-8');
      expect(file.fileName).toBe(`clarisa-glossary-${day}.csv`);
      expect(file.body.charCodeAt(0)).toBe(0xfeff);
      const lines = file.body.slice(1).split('\r\n');
      expect(lines[0]).toBe(
        'termId,groupId,term,alternativeLabels,definition,source,sourceUrl,referenceDate,portfolios,editorialStatus,replacedByTermId',
      );
      expect(lines[1]).toBe(
        '391,391,2030 outcome,,"2030 outcomes are the final, highest-level outcomes to be achieved by the end of 2030 by the Programs/Accelerators/Projects. It is expected that these 2030 outcomes would lead to measurable impacts.",,,,P25,approved,',
      );
      expect(lines[2].startsWith('354,42,Deliverable,,')).toBe(true);
      expect(lines[lines.length - 1]).toBe('');
    });

    it('skos keeps the prefixes, the scheme and the URI of every term', async () => {
      const file = await exporter.export(GlossaryExportFormat.SKOS);
      expect(file.contentType).toBe('text/turtle; charset=utf-8');
      expect(file.fileName).toBe(`clarisa-glossary-${day}.ttl`);
      const lines = file.body.split('\n');
      expect(lines.slice(0, 10)).toEqual([
        '@prefix skos: <http://www.w3.org/2004/02/skos/core#> .',
        '@prefix dcterms: <http://purl.org/dc/terms/> .',
        '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .',
        '@prefix owl: <http://www.w3.org/2002/07/owl#> .',
        '',
        '<https://clarisa.cgiar.org/glossary> a skos:ConceptScheme ;',
        '  dcterms:title "CLARISA Glossary"@en ;',
        '  dcterms:publisher "CGIAR — CLARISA" ;',
        `  dcterms:modified "${day}"^^xsd:date .`,
        '',
      ]);
      expect(file.body).toContain(
        '<https://clarisa.cgiar.org/glossary/term/391> a skos:Concept ;',
      );
      expect(file.body).toContain(
        '  skos:inScheme <https://clarisa.cgiar.org/glossary> ;',
      );
      expect(file.body).toContain('  skos:prefLabel "2030 outcome"@en ;');
      expect(file.body).toContain('  skos:notation "391" ;');
      expect(file.body).toContain(
        '<https://clarisa.cgiar.org/glossary/term/354> a skos:Concept ;',
      );
    });
  });
});
