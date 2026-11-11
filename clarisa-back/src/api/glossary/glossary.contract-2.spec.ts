// LDAPAuth reads src/shared/config/config.ts, which is git-ignored and absent in
// CI; nothing here authenticates (same mock as auth.service.spec).
jest.mock('../../auth/utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CanActivate,
  ClassSerializerInterceptor,
  ExecutionContext,
  HttpStatus,
  INestApplication,
  UnauthorizedException,
  VersioningType,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  PIPES_METADATA,
  VERSION_METADATA,
} from '@nestjs/common/constants';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { instanceToPlain } from 'class-transformer';
import request from 'supertest';
import { getMetadataArgsStorage } from 'typeorm';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { PERMISSION_ROUTE } from '../../shared/decorators/permission-route.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { UserService } from '../user/user.service';
import { SeedGlossaryAdminPermission1786320000000 } from '../../../migrations/1786320000000-SeedGlossaryAdminPermission';
import { ExceptionsFilter } from '../../shared/filters/exceptions.filter';
import { versionExtractor } from '../../shared/interfaces/version-extractor';
import { ResponseFormattingInterceptor } from '../../shared/interceptors/response-formatting.interceptor';
import { Portfolio } from '../portfolio/entities/portfolio.entity';
import { Glossary, GlossaryEditorialStatus } from './entities/glossary.entity';
import { GlossaryPortfolio } from './entities/glossary-portfolio.entity';
import { GlossaryController } from './glossary.controller';
import {
  GlossaryExportFormat,
  GlossaryExportService,
} from './glossary-export.service';
import { GlossaryService } from './glossary.service';
import { GLOSSARY_STORAGE } from './glossary-store';

/**
 * SECOND BATCH of the glossary contract (Yeck, 2026-10-29): the gaps batch 1
 * left unpinned. Same rule: this file describes what the code does TODAY,
 * oddities included (`// pinned as-is`), never what it should do. A red test
 * here means the v2 work changed something v1 consumers can see.
 */

// ------------------------------------------------------------------ fixtures

type Link = {
  id: number;
  name: string;
  acronym: string;
  active?: boolean;
  noObject?: boolean;
};

const P22 = { id: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22' };
const P25 = { id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' };

function term(
  id: number,
  title: string,
  definition: string,
  extra: Partial<Glossary> = {},
  links: Link[] = [],
): Glossary {
  const g = new Glossary();
  g.id = id;
  g.applicationName = null;
  g.group_id = null;
  g.title = title;
  g.definition = definition;
  g.source = null;
  g.sourceUrl = null;
  g.referenceDate = null;
  g.alternative_labels = null;
  g.editorial_status = GlossaryEditorialStatus.APPROVED;
  g.replaced_by_id = null;
  g.show_in_dashboard = false;
  g.glossary_portfolio_array = links.map((l) => {
    const link = new GlossaryPortfolio();
    link.glossary_id = id;
    link.portfolio_id = l.id;
    if (!l.noObject) {
      const portfolio = new Portfolio();
      portfolio.id = l.id;
      portfolio.name = l.name;
      portfolio.acronym = l.acronym;
      link.portfolio_object = portfolio;
    }
    link.auditableFields = { is_active: l.active ?? true } as any;
    return link;
  });
  g.auditableFields = { is_active: true } as any;
  Object.assign(g, extra);
  return g;
}

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

describe('Glossary public contract, batch 2', () => {
  // ------------------------------------------------ version param / unknown

  describe('the version extractor (main.ts enableVersioning)', () => {
    it('answers "1" when the request has no version at all', () => {
      expect(versionExtractor({ query: {} })).toBe('1');
      expect(versionExtractor({})).toBe('1');
      expect(versionExtractor(undefined)).toBe('1');
      expect(versionExtractor(null)).toBe('1');
    });

    it('answers String(value) when ?version= carries something', () => {
      expect(versionExtractor({ query: { version: '2' } })).toBe('2');
      expect(versionExtractor({ query: { version: 2 } })).toBe('2');
      expect(versionExtractor({ query: { version: 'banana' } })).toBe('banana');
    });

    it('falls back to "1" for an empty value but keeps the string "0"', () => {
      // pinned as-is: '' is falsy, '0' (a non-empty string) is truthy.
      expect(versionExtractor({ query: { version: '' } })).toBe('1');
      expect(versionExtractor({ query: { version: '0' } })).toBe('0');
    });

    it('joins a repeated ?version=1&version=2 into the string "1,2"', () => {
      // pinned as-is: Express hands an array and String() joins it with a comma.
      const result = versionExtractor({ query: { version: ['1', '2'] } });
      expect(result).toBe('1,2');
      expect(typeof result).toBe('string');
    });

    it('is the extractor main.ts registers, over a CUSTOM versioning type', () => {
      const main = readFileSync(join(__dirname, '../../main.ts'), 'utf8');
      expect(main).toMatch(
        /app\.enableVersioning\(\{\s*type: VersioningType\.CUSTOM,\s*extractor: versionExtractor,\s*\}\)/,
      );
    });

    it('no public handler and no controller declares a version of its own', () => {
      // pinned as-is: that is why every `?version=` value reaches the same handler.
      expect(
        Reflect.getMetadata(VERSION_METADATA, GlossaryController),
      ).toBeUndefined();
      for (const name of [
        'findAll',
        'export',
        'findAllForDashboard',
        'findOne',
        'update',
      ]) {
        expect(
          Reflect.getMetadata(
            VERSION_METADATA,
            GlossaryController.prototype[name],
          ),
        ).toBeUndefined();
      }
    });
  });

  // ------------------------------------------------------------- over HTTP

  describe('over HTTP, with versioning on like main.ts', () => {
    let app: INestApplication;
    // The store the service reads since 2026-11-06 (the taxonomy), faked.
    const repository = {
      all: jest.fn(),
      byId: jest.fn(),
      portfolioIds: jest.fn(),
      save: jest.fn(),
      setPortfolios: jest.fn(),
      transaction: jest.fn((work: any) => work(undefined)),
    };

    // A session is `Authorization: Bearer <email>` here; without it the JWT
    // guard answers 401 like passport-jwt does. The PermissionGuard is the real one.
    const fakeJwt: CanActivate = {
      canActivate: (ctx: ExecutionContext) => {
        const req = ctx.switchToHttp().getRequest();
        const email = /^Bearer (.+)$/.exec(
          req.headers.authorization ?? '',
        )?.[1];
        if (!email) throw new UnauthorizedException();
        req.user = { email };
        return true;
      },
    };
    const users = {
      findOneByEmail: jest.fn(async (email: string) => ({
        id: 9,
        email,
        permissions:
          email === 'admin@cgiar.org'
            ? ['/api/glossary/admin']
            : ['/api/countries'],
      })),
    };

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [GlossaryController],
        providers: [
          GlossaryService,
          GlossaryExportService,
          { provide: GLOSSARY_STORAGE, useValue: repository },
          { provide: UserService, useValue: users },
          { provide: APP_FILTER, useClass: ExceptionsFilter },
          { provide: APP_INTERCEPTOR, useClass: ResponseFormattingInterceptor },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue(fakeJwt)
        .compile();
      app = moduleRef.createNestApplication();
      app.enableVersioning({
        type: VersioningType.CUSTOM,
        extractor: versionExtractor,
      });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      jest.clearAllMocks();
      const dashboard = (id: number, title: string, active: boolean) => {
        const g = term(id, title, `${title} definition`, {
          show_in_dashboard: true,
        });
        g.auditableFields.is_active = active;
        return g;
      };
      repository.all.mockResolvedValue([
        term(1, 'Alpha', 'First', {}, [{ ...P25 }]),
        dashboard(11, 'Dash active', true),
        dashboard(12, 'Dash inactive', false),
        term(13, 'Dash draft', 'x', {
          show_in_dashboard: true,
          editorial_status: GlossaryEditorialStatus.DRAFT,
        }),
        Object.assign(term(14, 'Gone', 'Inactive one'), {
          auditableFields: { is_active: false },
        }),
      ]);
      repository.byId.mockResolvedValue(term(1, 'Alpha', 'First'));
    });

    it.each([
      ['/?version=2'],
      ['/?version=1'],
      ['/?version=banana'],
      ['/?version=2&portfolio=3'],
      ['/?portfolio=3'],
      ['/?foo=bar'],
      ['/?version=1&version=2'],
    ])('GET %s answers the v1 shape, eleven keys, unchanged', async (url) => {
      const res = await request(app.getHttpServer()).get(url);
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toHaveLength(2);
      expect(Object.keys(res.body[0])).toEqual(PUBLIC_KEYS);
      expect(res.body[0]).toEqual({
        term: 'Alpha',
        definition: 'First',
        source: null,
        sourceUrl: null,
        referenceDate: null,
        groupId: 1,
        termId: 1,
        editorialStatus: 'approved',
        replacedByTermId: null,
        alternativeLabels: [],
        portfolios: [P25],
      });
    });

    it('unknown query params do not change what is answered', async () => {
      const plain = await request(app.getHttpServer()).get('/');
      const odd = await request(app.getHttpServer()).get(
        '/?version=2&portfolio=3&foo=bar',
      );
      expect(repository.all).toHaveBeenCalledTimes(2);
      expect(odd.body).toEqual(plain.body);
      expect(plain.body.map((t: any) => t.termId)).toEqual([1, 11]);
    });

    it('?version=2 on the dashboard and on get/:id is ignored as well', async () => {
      const dash = await request(app.getHttpServer()).get(
        '/dashboard?version=2',
      );
      expect(dash.status).toBe(HttpStatus.OK);
      expect(Object.keys(dash.body[0])).toEqual(PUBLIC_KEYS);
      const one = await request(app.getHttpServer()).get('/get/1?version=2');
      expect(one.status).toBe(HttpStatus.OK);
      expect(Object.keys(one.body)).toEqual(PUBLIC_KEYS);
    });

    it('?show=foo is a 500 with the message "?!" in the production envelope', async () => {
      // pinned as-is: the service throws `Error('?!')` for an unknown option and
      // nothing turns it into a 400.
      const res = await request(app.getHttpServer()).get('/?show=foo');
      expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(Object.keys(res.body)).toEqual([
        'response',
        'message',
        'status',
        'date',
        'path',
      ]);
      expect(res.body.message).toBe('?!');
      expect(res.body.status).toBe(500);
      expect(res.body.path).toBe('/?show=foo');
      expect(repository.all).not.toHaveBeenCalled();
    });

    it('?show=a&show=b (a repeated param) is the same 500', async () => {
      // pinned as-is: Express hands the service an array, which matches no case.
      const res = await request(app.getHttpServer()).get('/?show=a&show=b');
      expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.body.message).toBe('?!');
      expect(repository.all).not.toHaveBeenCalled();
    });

    it('?show= (empty) is the same 500, not the default', async () => {
      // pinned as-is: only a MISSING show means "active"; an empty one is unknown.
      const res = await request(app.getHttpServer()).get('/?show=');
      expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.body.message).toBe('?!');
    });

    it('?show=ALL is a 500: the option is case-sensitive', async () => {
      const res = await request(app.getHttpServer()).get('/?show=ALL');
      expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('/dashboard?show=foo is the same 500', async () => {
      const res = await request(app.getHttpServer()).get('/dashboard?show=foo');
      expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.body.message).toBe('?!');
    });

    const termIds = (res: request.Response) =>
      res.body.map((t: any) => t.termId);

    it('/dashboard (no show) answers active dashboard terms', async () => {
      const res = await request(app.getHttpServer()).get('/dashboard');
      expect(termIds(res)).toEqual([11]);
    });

    it('/dashboard?show=all drops only the active filter, keeps dashboard and published', async () => {
      const res = await request(app.getHttpServer()).get('/dashboard?show=all');
      expect(termIds(res)).toEqual([11, 12]);
    });

    it('/dashboard?show=inactive answers inactive dashboard terms', async () => {
      const res = await request(app.getHttpServer()).get(
        '/dashboard?show=inactive',
      );
      expect(termIds(res)).toEqual([12]);
    });

    it('/dashboard?show=active equals /dashboard with no show', async () => {
      const a = await request(app.getHttpServer()).get(
        '/dashboard?show=active',
      );
      const b = await request(app.getHttpServer()).get('/dashboard');
      expect(a.body).toEqual(b.body);
    });

    it('?show=inactive on the main list answers inactive published terms', async () => {
      const res = await request(app.getHttpServer()).get('/?show=inactive');
      expect(termIds(res)).toEqual([12, 14]);
    });

    describe('GET get/:id with unusual ids', () => {
      it.each([
        ['1.5'],
        ['1e3'],
        ['abc'],
        ['0x10'],
        ['%201'],
        ['1abc'],
        ['--1'],
        ['+1'],
      ])('%s is a 400 and never reaches the repository', async (id) => {
        const res = await request(app.getHttpServer()).get(`/get/${id}`);
        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.status).toBe(400);
        expect(repository.byId).not.toHaveBeenCalled();
      });

      it('-1 is accepted and asked for as a negative id', async () => {
        // pinned as-is: ParseIntPipe takes any integer, signed ones included.
        const res = await request(app.getHttpServer()).get('/get/-1');
        expect(res.status).toBe(HttpStatus.OK);
        expect(repository.byId).toHaveBeenCalledWith(-1);
      });

      it('0 is accepted and asked for as id 0', async () => {
        const res = await request(app.getHttpServer()).get('/get/0');
        expect(res.status).toBe(HttpStatus.OK);
        expect(repository.byId).toHaveBeenCalledWith(0);
      });

      it('a huge number is accepted and rounded to a double', async () => {
        // pinned as-is: 99999999999999999999 becomes 1e20, past Number.MAX_SAFE_INTEGER.
        const res = await request(app.getHttpServer()).get(
          '/get/99999999999999999999',
        );
        expect(res.status).toBe(HttpStatus.OK);
        const arg = repository.byId.mock.calls[0][0];
        expect(arg).toBe(1e20);
        expect(Number.isSafeInteger(arg)).toBe(false);
      });

      it('leading zeros are read as decimal (007 is 7)', async () => {
        await request(app.getHttpServer()).get('/get/007');
        expect(repository.byId.mock.calls[0][0]).toBe(7);
      });
    });

    describe('PATCH update needs a session with the glossary admin permission (2026-11-11)', () => {
      const ADMIN = 'Bearer admin@cgiar.org';

      it('declares the JWT and permission guards on the route, pinned to /api/glossary/admin; still no pipe', () => {
        const handler = GlossaryController.prototype.update;
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
          JwtAuthGuard,
          PermissionGuard,
        ]);
        expect(Reflect.getMetadata(PERMISSION_ROUTE, handler)).toBe(
          (SeedGlossaryAdminPermission1786320000000 as any).ROUTE,
        );
        expect(
          Reflect.getMetadata(GUARDS_METADATA, GlossaryController),
        ).toBeUndefined();
        expect(Reflect.getMetadata(PIPES_METADATA, handler)).toBeUndefined();
        expect(
          Reflect.getMetadata(PIPES_METADATA, GlossaryController),
        ).toBeUndefined();
      });

      it('without credentials is a 401 and writes nothing', async () => {
        const res = await request(app.getHttpServer())
          .patch('/update')
          .send([{ id: 7, definition: 'anonymous' }]);
        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(repository.byId).not.toHaveBeenCalled();
        expect(repository.save).not.toHaveBeenCalled();
      });

      it('a session without the glossary admin permission is a 403 and writes nothing', async () => {
        const res = await request(app.getHttpServer())
          .patch('/update')
          .set('Authorization', 'Bearer reader@cgiar.org')
          .send([{ id: 7, definition: 'not mine' }]);
        expect(res.status).toBe(HttpStatus.FORBIDDEN);
        expect(repository.byId).not.toHaveBeenCalled();
        expect(repository.save).not.toHaveBeenCalled();
      });

      it('with the permission it writes any column of the body (no whitelist), through the store', async () => {
        // pinned as-is: no whitelist, so `editorial_status` and `is_active` travel.
        const body = [
          {
            id: 7,
            definition: 'edited',
            editorial_status: 'draft',
            is_active: false,
            show_in_dashboard: true,
            replaced_by_id: 99,
            totally_unknown: 'x',
          },
        ];
        const res = await request(app.getHttpServer())
          .patch('/update')
          .set('Authorization', ADMIN)
          .send(body);
        expect(res.status).toBe(HttpStatus.OK);
        expect(repository.byId.mock.calls[0][0]).toBe(7);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(repository.save.mock.calls[0][0]).toMatchObject({
          definition: 'edited',
          editorial_status: 'draft',
          show_in_dashboard: true,
          replaced_by_id: 99,
        });
        expect(res.body).toEqual(body);
      });

      it('with the permission it accepts a body that is not even an array', async () => {
        // pinned as-is: `@Body() UpdateGlossaryDto[]` is a type, not a validation.
        const res = await request(app.getHttpServer())
          .patch('/update')
          .set('Authorization', ADMIN)
          .send({ id: 7, title: 'one object' });
        expect(res.status).toBe(HttpStatus.OK);
        expect(repository.save.mock.calls[0][0]).toMatchObject({
          title: 'one object',
        });
      });

      it('with the permission an empty list answers 200 and []', async () => {
        const res = await request(app.getHttpServer())
          .patch('/update')
          .set('Authorization', ADMIN)
          .send([]);
        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toEqual([]);
      });
    });

    describe('GET export edge cases', () => {
      it('?format= (empty) is a 400 whose message quotes the empty value', async () => {
        const res = await request(app.getHttpServer()).get('/export?format=');
        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.message).toBe(
          'Unknown export format "". Use json, csv or skos.',
        );
      });

      it('?format=a&format=b is a 500 from .toLowerCase on an array', async () => {
        // pinned as-is: a repeated param is an array and the controller calls
        // `.toLowerCase()` on it before it validates anything.
        const res = await request(app.getHttpServer()).get(
          '/export?format=a&format=b',
        );
        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(res.body.message).toMatch(/toLowerCase is not a function/);
      });

      it('?format=json&format=json (equal values) is still the 500', async () => {
        const res = await request(app.getHttpServer()).get(
          '/export?format=json&format=json',
        );
        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      });

      it('?format=JSON and ?format=Skos are accepted whatever the case', async () => {
        const json = await request(app.getHttpServer()).get(
          '/export?format=JSON',
        );
        expect(json.status).toBe(HttpStatus.OK);
        expect(json.headers['content-type']).toBe(
          'application/json; charset=utf-8',
        );
        const skos = await request(app.getHttpServer()).get(
          '/export?format=Skos',
        );
        expect(skos.status).toBe(HttpStatus.OK);
        expect(skos.headers['content-type']).toBe('text/turtle; charset=utf-8');
      });

      it('?format=%20csv (with a space) is a 400 that quotes the raw value', async () => {
        const res = await request(app.getHttpServer()).get(
          '/export?format=%20csv',
        );
        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.message).toBe(
          'Unknown export format " csv". Use json, csv or skos.',
        );
      });

      it('export publishes active published terms only, whatever ?show says', async () => {
        const res = await request(app.getHttpServer()).get('/export?show=all');
        expect(JSON.parse(res.text).map((t: any) => t.termId)).toEqual([1, 11]);
      });

      it('?version=2 does not change the export either', async () => {
        const res = await request(app.getHttpServer()).get('/export?version=2');
        expect(res.status).toBe(HttpStatus.OK);
        expect(Object.keys(JSON.parse(res.text)[0])).toEqual(PUBLIC_KEYS);
      });
    });
  });

  // ------------------------------------------------------ portfolio linkage

  describe('portfolios of a published term', () => {
    it('omits a link whose portfolio_object is null', () => {
      const t = term(1, 'Alpha', 'd', {}, [
        { ...P22, noObject: true },
        { ...P25 },
      ]);
      expect(instanceToPlain(t).portfolios).toEqual([P25]);
    });

    it('keeps the order of the array it was given, with no sort', () => {
      const t = term(1, 'Alpha', 'd', {}, [{ ...P25 }, { ...P22 }]);
      expect(instanceToPlain(t).portfolios.map((p) => p.acronym)).toEqual([
        'P25',
        'P22',
      ]);
    });

    it('omits a link with no auditableFields at all', () => {
      const t = term(1, 'Alpha', 'd', {}, [{ ...P22 }, { ...P25 }]);
      t.glossary_portfolio_array[0].auditableFields = undefined;
      expect(instanceToPlain(t).portfolios).toEqual([P25]);
    });

    it('publishes [] when the relation was not loaded (undefined)', () => {
      const t = term(1, 'Alpha', 'd');
      t.glossary_portfolio_array = undefined;
      expect(instanceToPlain(t).portfolios).toEqual([]);
    });

    it('publishes only id, name and acronym of the portfolio', () => {
      const t = term(1, 'Alpha', 'd', {}, [{ ...P25 }]);
      (t.glossary_portfolio_array[0].portfolio_object as any).description =
        'secret';
      expect(Object.keys(instanceToPlain(t).portfolios[0])).toEqual([
        'id',
        'name',
        'acronym',
      ]);
    });
  });

  describe('ordering and ties', () => {
    const storeOf = (rows: Glossary[]) => ({
      transaction: jest.fn((work: any) => work(undefined)),
      all: jest.fn().mockResolvedValue(rows),
      byId: jest.fn(),
      portfolioIds: jest.fn(),
      save: jest.fn(),
      setPortfolios: jest.fn(),
    });

    it('reads the store once and keeps its order (the store sorts by term, like title ASC)', async () => {
      const store = storeOf([term(2, 'Zeta', 'z'), term(1, 'Alpha', 'a')]);
      const service = new GlossaryService(store);
      const rows = await service.findAll();
      expect(store.all).toHaveBeenCalledTimes(1);
      expect(rows.map((r) => Number(r.id))).toEqual([2, 1]);
    });

    it('two terms with the same title keep the order the store gave', async () => {
      // pinned as-is: the service never re-sorts, so ties follow the database.
      const first = term(20, 'Outcome', 'newer', { group_id: 5 as any });
      const second = term(5, 'Outcome', 'older');
      const store = storeOf([first, second]);
      const service = new GlossaryService(store);
      const rows = await service.findAll();
      expect(rows.map((r) => Number(r.id))).toEqual([20, 5]);
      store.all.mockResolvedValue([second, first]);
      const swapped = await service.findAll();
      expect(swapped.map((r) => Number(r.id))).toEqual([5, 20]);
    });

    it('getRolesPagination (leftover) orders by id and defaults to 10', async () => {
      // pinned as-is: a method with a copy-pasted name that nothing routes to.
      const many = Array.from({ length: 12 }, (_, i) =>
        term(12 - i, `T${i}`, 'd'),
      );
      const service = new GlossaryService(storeOf(many));
      const page = await service.getRolesPagination();
      expect(page.count).toBe(12);
      expect(page.items.map((r) => Number(r.id))).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);
      await expect(
        new GlossaryService(storeOf([])).getRolesPagination(),
      ).resolves.toEqual({ items: [], count: 0 });
    });

    it('findAll throws "?!" for a value outside FindAllOptions', () => {
      const service = new GlossaryService({ find: jest.fn() } as any);
      expect(() => service.findAll('banana' as any)).toThrow('?!');
      expect(() => service.findAll(['active'] as any)).toThrow('?!');
    });

    it('findAll(null) is NOT the default: it throws too', () => {
      // pinned as-is: only `undefined` triggers the default parameter.
      const service = new GlossaryService({ find: jest.fn() } as any);
      expect(() => service.findAll(null as any)).toThrow('?!');
    });
  });

  // ------------------------------------------------------------- swagger

  describe('what the public Swagger decorators say', () => {
    const proto = GlossaryController.prototype;

    it('lists the glossary with this exact summary', () => {
      const op = Reflect.getMetadata(DECORATORS.API_OPERATION, proto.findAll);
      expect(op.summary).toBe('List glossary terms');
    });

    it('describes the list with this exact text', () => {
      const op = Reflect.getMetadata(DECORATORS.API_OPERATION, proto.findAll);
      expect(op.description).toBe(
        'Each term includes a "portfolios" array with the CGIAR portfolios ' +
          '(id, name, acronym) the term belongs to. ' +
          "CLARISA Glossary is CGIAR's standardized glossary of terms used in " +
          'performance management, planning, and reporting. It defines the common ' +
          'vocabulary — covering structural concepts (Program, Accelerator, Area of ' +
          'Work, Portfolio), results-framework terms (Output, Outcome, Impact, ' +
          'Impact Area, Indicator, Theory of Change), and scaling/innovation terms ' +
          '(Innovation Package, Scaling Readiness, IPSR) — so that Centers, ' +
          'Programs & Accelerators use consistent definitions when planning work ' +
          'and reporting results. ' +
          'Each term may also carry its provenance: "source" (the document or body ' +
          'the definition comes from), "sourceUrl" (a link to it, when public) and ' +
          '"referenceDate" (the date of that material, as YYYY-MM-DD). The three are ' +
          'null while a definition has not been attributed yet. ' +
          'A term whose meaning changed between portfolios is published once per ' +
          'version, so the same "term" can appear more than once: each entry ' +
          'carries the portfolios its definition applies to, and every entry of ' +
          'the same concept shares a "groupId". Terms that were never versioned ' +
          'return a single entry, as they always have. ' +
          'Last updated September 2026.',
      );
    });

    it('documents ?show with its three values, optional', () => {
      expect(
        Reflect.getMetadata(DECORATORS.API_PARAMETERS, proto.findAll),
      ).toEqual([
        {
          name: 'show',
          required: false,
          in: 'query',
          description:
            "Filter by status: 'all', 'active' (default) or 'inactive'.",
          schema: { enum: ['all', 'active', 'inactive'], type: 'string' },
        },
      ]);
    });

    it('documents the export with its exact summary, description and ?format', () => {
      const op = Reflect.getMetadata(DECORATORS.API_OPERATION, proto.export);
      expect(op.summary).toBe('Download the whole glossary as one file');
      expect(op.description).toBe(
        'Every active term in one download, in the format asked for: "json" ' +
          '(default; the same keys as GET api/glossary), "csv" (one row per term, ' +
          'definitions as plain text, UTF-8) or "skos" (Turtle: one skos:Concept ' +
          'per term under a skos:ConceptScheme, with its persistent URI built on ' +
          '"termId", prefLabel, altLabel, definition and provenance). Served as an ' +
          'attachment. Read-only and public, like GET api/glossary.',
      );
      expect(
        Reflect.getMetadata(DECORATORS.API_PARAMETERS, proto.export),
      ).toEqual([
        {
          name: 'format',
          required: false,
          in: 'query',
          description: "'json' (default), 'csv' or 'skos'.",
          schema: { enum: ['json', 'csv', 'skos'], type: 'string' },
        },
      ]);
    });

    it('/dashboard, get/:id and update carry no operation and no query docs', () => {
      // pinned as-is: they are not in the public OpenAPI allow-list either.
      for (const name of ['findAllForDashboard', 'findOne', 'update']) {
        expect(
          Reflect.getMetadata(DECORATORS.API_OPERATION, proto[name]),
        ).toBeUndefined();
        expect(
          Reflect.getMetadata(DECORATORS.API_PARAMETERS, proto[name]),
        ).toBeUndefined();
      }
    });

    it('tags the controller as Glossary', () => {
      expect(
        Reflect.getMetadata(DECORATORS.API_TAGS, GlossaryController),
      ).toEqual(['Glossary']);
    });

    it('serialises through ClassSerializerInterceptor and nothing else', () => {
      expect(ClassSerializerInterceptor).toBeDefined();
      expect(
        Reflect.getMetadata('__interceptors__', GlossaryController),
      ).toEqual([ClassSerializerInterceptor]);
    });
  });

  // --------------------------------------------------- entity / database

  describe('the database columns the entities are bound to', () => {
    const storage = getMetadataArgsStorage();

    /** `propertyName → column options`, with a function default resolved. */
    const columnsOf = (target: unknown) =>
      Object.fromEntries(
        storage.columns
          .filter((c) => c.target === target)
          .map((c) => [
            c.propertyName,
            {
              ...c.options,
              ...(typeof c.options.default === 'function'
                ? { default: (c.options.default as () => unknown)() }
                : {}),
            },
          ]),
      );

    it('maps Glossary to the table `glossary` and the link to `glossary_portfolios`', () => {
      expect(
        storage.tables.filter((t) => t.target === Glossary).map((t) => t.name),
      ).toEqual(['glossary']);
      expect(
        storage.tables
          .filter((t) => t.target === GlossaryPortfolio)
          .map((t) => t.name),
      ).toEqual(['glossary_portfolios']);
    });

    it('binds every property of Glossary to this column, type, length and default', () => {
      expect(columnsOf(Glossary)).toEqual({
        id: { type: 'bigint', primary: true },
        applicationName: { type: 'varchar', length: 100, nullable: true },
        group_id: { name: 'group_id', type: 'bigint', nullable: true },
        title: { type: 'text', nullable: false },
        definition: { type: 'text', nullable: false },
        source: { type: 'varchar', length: 500, nullable: true },
        sourceUrl: {
          name: 'source_url',
          type: 'varchar',
          length: 500,
          nullable: true,
        },
        referenceDate: {
          name: 'reference_date',
          type: 'date',
          nullable: true,
        },
        alternative_labels: {
          name: 'alternative_labels',
          type: 'text',
          nullable: true,
        },
        editorial_status: {
          name: 'editorial_status',
          type: 'varchar',
          length: 20,
          nullable: false,
          default: 'approved',
        },
        replaced_by_id: {
          name: 'replaced_by_id',
          type: 'bigint',
          nullable: true,
        },
        show_in_dashboard: { type: 'tinyint', nullable: false, default: '0' },
      });
    });

    it('keeps the snake_case names the v1 consumers and the migrations know', () => {
      const cols = columnsOf(Glossary);
      expect(cols.group_id.name).toBe('group_id');
      expect(cols.sourceUrl.name).toBe('source_url');
      expect(cols.referenceDate.name).toBe('reference_date');
      expect(cols.alternative_labels.name).toBe('alternative_labels');
      expect(cols.editorial_status.name).toBe('editorial_status');
      expect(cols.replaced_by_id.name).toBe('replaced_by_id');
    });

    it('stores applicationName, title, definition and show_in_dashboard under their property name', () => {
      // pinned as-is: no `name` option, so the column is the property (camelCase
      // for applicationName). A rename here is a migration.
      const cols = columnsOf(Glossary);
      for (const key of [
        'applicationName',
        'title',
        'definition',
        'source',
        'show_in_dashboard',
      ]) {
        expect(cols[key].name).toBeUndefined();
      }
    });

    it('defaults editorial_status to approved, so old rows stay published', () => {
      expect(columnsOf(Glossary).editorial_status.default).toBe(
        GlossaryEditorialStatus.APPROVED,
      );
      expect(columnsOf(Glossary).editorial_status.nullable).toBe(false);
    });

    it('defaults show_in_dashboard to 0 (the function returns the string "0")', () => {
      const raw = storage.columns.find(
        (c) => c.target === Glossary && c.propertyName === 'show_in_dashboard',
      );
      expect(typeof raw.options.default).toBe('function');
      expect((raw.options.default as () => string)()).toBe('0');
    });

    it('makes id an auto-increment bigint primary key', () => {
      expect(
        storage.generations
          .filter((g) => g.target === Glossary)
          .map((g) => [g.propertyName, g.strategy]),
      ).toEqual([['id', 'increment']]);
    });

    it('binds the link table to glossary_id and portfolio_id', () => {
      expect(columnsOf(GlossaryPortfolio)).toEqual({
        id: { type: 'bigint', primary: true },
        glossary_id: { type: 'bigint', nullable: false },
        portfolio_id: { type: 'bigint', nullable: false },
      });
      expect(
        storage.joinColumns
          .filter((j) => j.target === GlossaryPortfolio)
          .map((j) => [j.propertyName, j.name]),
      ).toEqual([
        ['glossary_object', 'glossary_id'],
        ['portfolio_object', 'portfolio_id'],
      ]);
    });

    it('relates Glossary to its links one-to-many and the link to both sides many-to-one', () => {
      expect(
        storage.relations
          .filter((r) => r.target === Glossary)
          .map((r) => [r.propertyName, r.relationType]),
      ).toEqual([['glossary_portfolio_array', 'one-to-many']]);
      expect(
        storage.relations
          .filter((r) => r.target === GlossaryPortfolio)
          .map((r) => [r.propertyName, r.relationType]),
      ).toEqual([
        ['glossary_object', 'many-to-one'],
        ['portfolio_object', 'many-to-one'],
      ]);
    });

    it('embeds the auditable columns without a prefix, on both tables', () => {
      for (const target of [Glossary, GlossaryPortfolio]) {
        const embedded = storage.embeddeds.filter((e) => e.target === target);
        expect(embedded.map((e) => e.propertyName)).toEqual([
          'auditableFields',
        ]);
        expect(embedded[0].prefix).toBe('');
      }
    });
  });

  // ------------------------------------------------------------ export JSON

  describe('export files, byte by byte', () => {
    const findAll = jest.fn();
    const exporter = new GlossaryExportService({ findAll } as any);

    afterEach(() => {
      jest.useRealTimers();
      findAll.mockReset();
    });

    const twoTerms = () => [
      term(1, 'Alpha', 'First', { alternative_labels: '["A"]' }, [{ ...P25 }]),
      term(2, 'Beta', 'Second', { group_id: 1 as any }),
    ];

    it('json is JSON.stringify(terms, null, 2): two-space indent, key order, no trailing newline', async () => {
      findAll.mockResolvedValue(twoTerms());
      const file = await exporter.export(GlossaryExportFormat.JSON);
      const expected = [
        {
          term: 'Alpha',
          definition: 'First',
          source: null,
          sourceUrl: null,
          referenceDate: null,
          groupId: 1,
          termId: 1,
          editorialStatus: 'approved',
          replacedByTermId: null,
          alternativeLabels: ['A'],
          portfolios: [P25],
        },
        {
          term: 'Beta',
          definition: 'Second',
          source: null,
          sourceUrl: null,
          referenceDate: null,
          groupId: 1,
          termId: 2,
          editorialStatus: 'approved',
          replacedByTermId: null,
          alternativeLabels: [],
          portfolios: [],
        },
      ];
      expect(file.body).toBe(JSON.stringify(expected, null, 2));
      expect(file.body.endsWith('\n')).toBe(false);
      expect(file.body.startsWith('[\n  {\n    "term": "Alpha",\n')).toBe(true);
      expect(file.body).toContain('\n    "portfolios": []\n  }\n]');
    });

    it('json of an empty glossary is the two characters "[]"', async () => {
      findAll.mockResolvedValue([]);
      const file = await exporter.export(GlossaryExportFormat.JSON);
      expect(file.body).toBe('[]');
    });

    it('an unknown format value falls to the json branch (the controller prevents it)', async () => {
      // pinned as-is: `default` shares the JSON case.
      findAll.mockResolvedValue([]);
      const file = await exporter.export('xml' as GlossaryExportFormat);
      expect(file.contentType).toBe('application/json; charset=utf-8');
      expect(file.fileName).toMatch(/\.json$/);
    });

    it('asks the service for active terms only', async () => {
      findAll.mockResolvedValue([]);
      await exporter.export(GlossaryExportFormat.CSV);
      expect(findAll).toHaveBeenCalledWith(FindAllOptions.SHOW_ONLY_ACTIVE);
    });

    it('names the file with the UTC day, even at 23:30 in Bogota', async () => {
      // 2026-10-29 23:30 in Bogota (UTC-5) is already 2026-10-30 in UTC.
      jest.useFakeTimers().setSystemTime(new Date('2026-10-30T04:30:00Z'));
      findAll.mockResolvedValue([]);
      const csv = await exporter.export(GlossaryExportFormat.CSV);
      const skos = await exporter.export(GlossaryExportFormat.SKOS);
      const json = await exporter.export(GlossaryExportFormat.JSON);
      expect(csv.fileName).toBe('clarisa-glossary-2026-10-30.csv');
      expect(skos.fileName).toBe('clarisa-glossary-2026-10-30.ttl');
      expect(json.fileName).toBe('clarisa-glossary-2026-10-30.json');
      expect(skos.body).toContain('dcterms:modified "2026-10-30"^^xsd:date .');
    });

    it('keeps the previous UTC day until midnight UTC, whatever the clock in Bogota says', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-30T04:59:59Z'));
      findAll.mockResolvedValue([]);
      const file = await exporter.export(GlossaryExportFormat.CSV);
      expect(file.fileName).toBe('clarisa-glossary-2026-10-30.csv');
      jest.setSystemTime(new Date('2026-10-29T23:59:59Z'));
      const before = await exporter.export(GlossaryExportFormat.CSV);
      expect(before.fileName).toBe('clarisa-glossary-2026-10-29.csv');
    });
  });
});
