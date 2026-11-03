// LDAPAuth reads src/shared/config/config.ts, which is git-ignored and absent in
// CI; nothing here authenticates (same mock as auth.service.spec).
jest.mock('../../auth/utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));

import {
  ArgumentMetadata,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UserData } from '../../shared/interfaces/user-data';
import { Portfolio } from '../portfolio/entities/portfolio.entity';
import { User } from '../user/entities/user.entity';
import {
  CreateGlossaryTermDto,
  GlossaryBulkDto,
  GlossaryBulkRowAction,
  GlossaryTermRelationDto,
  REFERENCE_DATE_PATTERN,
  SplitGlossaryTermDto,
  UpdateGlossaryEditorialStatusDto,
  UpdateGlossaryStatusDto,
  UpdateGlossaryTermDto,
} from './dto/glossary-admin.dto';
import { GlossaryPortfolio } from './entities/glossary-portfolio.entity';
import { Glossary, GlossaryEditorialStatus } from './entities/glossary.entity';
import { GlossaryAdminController } from './glossary-admin.controller';
import { GlossaryAdminService } from './glossary-admin.service';

/**
 * SECOND BATCH of the admin contract (2026-10-29). Everything the panel can
 * do to the glossary, pinned as the service does it TODAY. `// pinned as-is`
 * marks oddities. The repositories are in-memory fakes: no database.
 */

const user: UserData = {
  userId: 7,
  email: 'y.zuniga@cgiar.org',
  permissions: '/api/',
};

const PORTFOLIOS: Partial<Portfolio>[] = [
  { id: 1, name: 'General', acronym: 'GEN' },
  { id: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22' },
  { id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' },
];

type Saved = { entity: string; value: any };

/** In-memory manager: rows, links, portfolios and users, plus a call log. */
function harness() {
  const log: string[] = [];
  const rows = new Map<number, Glossary>();
  const links: any[] = [];
  const users: any[] = [];
  const saved: Saved[] = [];
  const created: { entity: string; plain: any }[] = [];
  let nextId = 100;

  const snapshot = (value: any) => JSON.parse(JSON.stringify(value));

  const manager: any = {
    find: jest.fn(async (entity: any, options: any) => {
      log.push(`find:${entity.name}`);
      if (entity === Portfolio) {
        const wanted: number[] = options?.where?.id?._value ?? [];
        return PORTFOLIOS.filter((p) => wanted.includes(Number(p.id)));
      }
      if (entity === Glossary) return [...rows.values()];
      if (entity === GlossaryPortfolio) {
        return links.filter(
          (l) => Number(l.glossary_id) === Number(options.where.glossary_id),
        );
      }
      if (entity === User) {
        const wanted: number[] = options?.where?.id?._value ?? [];
        return users.filter((u) => wanted.includes(Number(u.id)));
      }
      return [];
    }),
    findOne: jest.fn(async (entity: any, options: any) => {
      log.push(`findOne:${entity.name}`);
      const row = rows.get(Number(options?.where?.id));
      if (!row) return null;
      row.glossary_portfolio_array = links
        .filter((l) => Number(l.glossary_id) === Number(row.id))
        .map((l) => {
          l.portfolio_object = PORTFOLIOS.find(
            (p) => Number(p.id) === Number(l.portfolio_id),
          ) as Portfolio;
          return l;
        });
      return row;
    }),
    create: jest.fn((entity: any, plain: any) => {
      created.push({ entity: entity.name, plain });
      return Object.assign(new entity(), plain);
    }),
    save: jest.fn(async (entity: any, value: any) => {
      log.push(`save:${entity.name}`);
      const list = Array.isArray(value) ? value : [value];
      saved.push({ entity: entity.name, value: snapshot(value) });
      for (const v of list) {
        if (entity === Glossary && v.id === undefined) {
          v.id = nextId++;
          rows.set(Number(v.id), v);
        }
        if (entity === GlossaryPortfolio && !links.includes(v)) {
          if (v.id === undefined) v.id = nextId++;
          links.push(v);
        }
      }
      return value;
    }),
  };

  const dataSource: any = {
    manager,
    transaction: jest.fn((cb: any) => cb(manager)),
  };
  const repository: any = { find: jest.fn(async () => [...rows.values()]) };
  const service = new GlossaryAdminService(repository, dataSource);

  const addRow = (
    id: number,
    title: string,
    extra: Partial<Glossary> = {},
    audit: Record<string, unknown> = {},
  ): Glossary => {
    const g = new Glossary();
    g.id = id;
    g.applicationName = null;
    g.group_id = null;
    g.title = title;
    g.definition = `definition of ${title}`;
    g.source = null;
    g.sourceUrl = null;
    g.referenceDate = null;
    g.alternative_labels = null;
    g.editorial_status = GlossaryEditorialStatus.APPROVED;
    g.replaced_by_id = null;
    g.show_in_dashboard = false;
    g.auditableFields = {
      is_active: true,
      created_by: 1,
      updated_by: null,
      ...audit,
    } as any;
    Object.assign(g, extra);
    rows.set(id, g);
    return g;
  };

  const addLink = (glossaryId: number, portfolioId: number, active = true) => {
    const link = new GlossaryPortfolio();
    link.id = nextId++;
    link.glossary_id = glossaryId;
    link.portfolio_id = portfolioId;
    link.auditableFields = { is_active: active, created_by: 1 } as any;
    links.push(link);
    return link;
  };

  const savedOf = (entity: string) => saved.filter((s) => s.entity === entity);

  return {
    log,
    rows,
    links,
    users,
    saved,
    created,
    manager,
    dataSource,
    repository,
    service,
    addRow,
    addLink,
    savedOf,
  };
}

/** `ValidationPipe` exactly as the admin controller declares it. */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const validate = (metatype: unknown, body: unknown) =>
  pipe.transform(body, {
    type: 'body',
    metatype: metatype as ArgumentMetadata['metatype'],
    data: '',
  });
/** The list of messages a refused payload carries. */
const refusal = async (metatype: unknown, body: unknown): Promise<string[]> => {
  try {
    await validate(metatype, body);
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    const message = (e as BadRequestException).getResponse() as any;
    return message.message;
  }
  throw new Error('the payload was accepted');
};

describe('Glossary admin contract, batch 2', () => {
  // ----------------------------------------------------------------- reads

  describe('findAllForAdmin: what the repository is asked (buildFindOptions)', () => {
    const relations = { glossary_portfolio_array: { portfolio_object: true } };

    it('show=all: relations and order, with NO where', async () => {
      const h = harness();
      await h.service.findAllForAdmin(FindAllOptions.SHOW_ALL);
      const options = h.repository.find.mock.calls[0][0];
      expect(options).toEqual({ relations, order: { title: 'ASC' } });
      expect('where' in options).toBe(false);
    });

    it('no argument is show=all', async () => {
      const h = harness();
      await h.service.findAllForAdmin();
      expect(h.repository.find.mock.calls[0][0]).toEqual({
        relations,
        order: { title: 'ASC' },
      });
    });

    it('show=active asks for is_active true on the audit columns', async () => {
      const h = harness();
      await h.service.findAllForAdmin(FindAllOptions.SHOW_ONLY_ACTIVE);
      expect(h.repository.find.mock.calls[0][0]).toEqual({
        relations,
        order: { title: 'ASC' },
        where: { auditableFields: { is_active: true } },
      });
    });

    it('show=inactive asks for is_active false', async () => {
      const h = harness();
      await h.service.findAllForAdmin(FindAllOptions.SHOW_ONLY_INACTIVE);
      expect(h.repository.find.mock.calls[0][0].where).toEqual({
        auditableFields: { is_active: false },
      });
    });

    it('?show=foo is treated as active, silently', async () => {
      // pinned as-is: `show !== inactive` — unlike the public list, no error.
      const h = harness();
      await h.service.findAllForAdmin('foo' as any);
      expect(h.repository.find.mock.calls[0][0].where).toEqual({
        auditableFields: { is_active: true },
      });
    });

    it('does not filter by editorial status: drafts and in-review terms are listed', async () => {
      const h = harness();
      await h.service.findAllForAdmin(FindAllOptions.SHOW_ALL);
      expect(JSON.stringify(h.repository.find.mock.calls[0][0])).not.toMatch(
        /editorial/,
      );
    });

    it('has no pagination: no skip, no take', async () => {
      const h = harness();
      await h.service.findAllForAdmin(FindAllOptions.SHOW_ONLY_ACTIVE);
      const options = h.repository.find.mock.calls[0][0];
      expect(options.skip).toBeUndefined();
      expect(options.take).toBeUndefined();
      expect(Object.keys(options)).toEqual(['relations', 'order', 'where']);
    });

    it('keeps the order of the repository: the service never re-sorts', async () => {
      const h = harness();
      h.addRow(2, 'Zeta');
      h.addRow(1, 'Alpha');
      const list = await h.service.findAllForAdmin();
      expect(list.map((t) => t.term)).toEqual(['Zeta', 'Alpha']);
    });

    it('resolves every author with one User query for the whole list', async () => {
      const h = harness();
      h.addRow(1, 'A', {}, { created_by: 5 });
      h.addRow(2, 'B', {}, { created_by: 5 });
      h.addRow(3, 'C', {}, { created_by: 6 });
      h.users.push(
        { id: 5, first_name: 'Ana', last_name: 'Gil', email: 'a@x' },
        { id: 6, first_name: 'Bo', last_name: 'Lu', email: 'b@x' },
      );
      await h.service.findAllForAdmin();
      expect(
        h.manager.find.mock.calls.filter((c: any[]) => c[0] === User),
      ).toHaveLength(1);
    });

    it('asks for no user at all when nobody has a usable id', async () => {
      const h = harness();
      h.addRow(1, 'A', {}, { created_by: null, updated_by: null });
      const list = await h.service.findAllForAdmin();
      expect(
        h.manager.find.mock.calls.filter((c: any[]) => c[0] === User),
      ).toHaveLength(0);
      expect(list[0].last_modified_by).toBeNull();
    });
  });

  describe('GlossaryAdminDto: the shape the panel reads', () => {
    const KEYS = [
      'id',
      'group_id',
      'term',
      'definition',
      'source',
      'source_url',
      'reference_date',
      'alternative_labels',
      'editorial_status',
      'replaced_by_id',
      'is_active',
      'show_in_dashboard',
      'application_name',
      'portfolios',
      'last_modified_at',
      'last_modified_by',
    ];

    const full = (h: ReturnType<typeof harness>) => {
      h.addRow(
        8,
        'Impact',
        {
          group_id: 4 as any,
          definition: 'The change.',
          source: 'CGIAR',
          sourceUrl: 'https://x.org',
          referenceDate: '2025-01-15',
          alternative_labels: '["IA"]',
          editorial_status: GlossaryEditorialStatus.DEPRECATED,
          replaced_by_id: '9' as any,
          show_in_dashboard: true,
          applicationName: 'PRMS',
        },
        {
          is_active: true,
          created_at: new Date('2022-08-04T10:00:00Z'),
          updated_at: new Date('2026-09-25T10:00:00Z'),
          updated_by: 5,
        },
      );
      h.addLink(8, 2);
      h.addLink(8, 3, false);
      h.users.push({
        id: 5,
        first_name: 'Ana',
        last_name: 'Gil',
        email: 'a@x',
      });
    };

    it('is exactly these sixteen keys, in this order', async () => {
      const h = harness();
      full(h);
      const dto = await h.service.findOneForAdmin(8);
      expect(Object.keys(dto)).toEqual(KEYS);
      expect(KEYS).toHaveLength(16);
    });

    it('carries every value of a full row, typed as the panel expects', async () => {
      const h = harness();
      full(h);
      await expect(h.service.findOneForAdmin(8)).resolves.toEqual({
        id: 8,
        group_id: 4,
        term: 'Impact',
        definition: 'The change.',
        source: 'CGIAR',
        source_url: 'https://x.org',
        reference_date: '2025-01-15',
        alternative_labels: ['IA'],
        editorial_status: 'deprecated',
        replaced_by_id: 9,
        is_active: true,
        show_in_dashboard: true,
        application_name: 'PRMS',
        portfolios: [
          { id: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22' },
        ],
        last_modified_at: '2026-09-25T10:00:00.000Z',
        last_modified_by: { id: 5, name: 'Ana Gil', email: 'a@x' },
      });
    });

    it('turns is_active into a strict boolean with !!', async () => {
      const h = harness();
      h.addRow(1, 'A', {}, { is_active: 1 });
      h.addRow(2, 'B', {}, { is_active: 0 });
      h.addRow(3, 'C', {}, { is_active: undefined });
      const [a, b, c] = await h.service.findAllForAdmin();
      expect(a.is_active).toBe(true);
      expect(b.is_active).toBe(false);
      expect(c.is_active).toBe(false);
    });

    it('turns show_in_dashboard into a strict boolean with !!', async () => {
      const h = harness();
      h.addRow(1, 'A', { show_in_dashboard: 1 as any });
      h.addRow(2, 'B', { show_in_dashboard: 0 as any });
      h.addRow(3, 'C', { show_in_dashboard: undefined });
      const list = await h.service.findAllForAdmin();
      expect(list.map((t) => t.show_in_dashboard)).toEqual([
        true,
        false,
        false,
      ]);
    });

    it('an undefined application_name is dropped from the JSON, a null one is kept', async () => {
      // pinned as-is: the DTO copies `applicationName` untouched.
      const h = harness();
      h.addRow(1, 'A', { applicationName: undefined });
      h.addRow(2, 'B', { applicationName: null });
      const [a, b] = await h.service.findAllForAdmin();
      expect('application_name' in a).toBe(true);
      expect(Object.keys(JSON.parse(JSON.stringify(a)))).toHaveLength(15);
      expect(Object.keys(JSON.parse(JSON.stringify(a)))).not.toContain(
        'application_name',
      );
      expect(JSON.parse(JSON.stringify(b)).application_name).toBeNull();
    });

    it('cuts reference_date to its first ten characters', async () => {
      const h = harness();
      h.addRow(1, 'A', { referenceDate: '2026-09-01T00:00:00.000Z' });
      h.addRow(2, 'B', { referenceDate: '2026-09-01' });
      h.addRow(3, 'C', { referenceDate: '' });
      h.addRow(4, 'D', { referenceDate: null });
      const list = await h.service.findAllForAdmin();
      expect(list.map((t) => t.reference_date)).toEqual([
        '2026-09-01',
        '2026-09-01',
        null,
        null,
      ]);
    });

    it('throws on a reference date that is a Date object', async () => {
      // pinned as-is: toIsoDay calls `.slice` and assumes the string TypeORM
      // hands for a `date` column. A Date (a driver option change) would crash
      // the whole list.
      const h = harness();
      h.addRow(1, 'A', { referenceDate: new Date('2026-09-01') as any });
      await expect(h.service.findOneForAdmin(1)).rejects.toThrow(TypeError);
    });

    it('does not shift the day of a reference date west of Greenwich', async () => {
      const h = harness();
      h.addRow(1, 'A', { referenceDate: '2026-09-01' });
      const dto = await h.service.findOneForAdmin(1);
      expect(dto.reference_date).toBe('2026-09-01');
    });

    it('last_modified_at is null when the row has neither date', async () => {
      const h = harness();
      h.addRow(1, 'A', {}, { created_at: undefined, updated_at: undefined });
      expect((await h.service.findOneForAdmin(1)).last_modified_at).toBeNull();
    });

    it('last_modified_at falls back to created_at when nobody edited the row', async () => {
      const h = harness();
      h.addRow(
        1,
        'A',
        {},
        { created_at: new Date('2022-08-04T00:00:00Z'), updated_at: null },
      );
      expect((await h.service.findOneForAdmin(1)).last_modified_at).toBe(
        '2022-08-04T00:00:00.000Z',
      );
    });

    it('last_modified_at accepts a string date as well', async () => {
      const h = harness();
      h.addRow(1, 'A', {}, { updated_at: '2026-01-02T03:04:05Z' });
      expect((await h.service.findOneForAdmin(1)).last_modified_at).toBe(
        '2026-01-02T03:04:05.000Z',
      );
    });

    it('names the author by updated_by, then by created_by', async () => {
      const h = harness();
      h.addRow(1, 'Edited', {}, { created_by: 5, updated_by: 6 });
      h.addRow(2, 'Untouched', {}, { created_by: 5, updated_by: null });
      h.users.push(
        { id: 5, first_name: 'Ana', last_name: 'Gil', email: 'a@x' },
        { id: 6, first_name: 'Bo', last_name: 'Lu', email: 'b@x' },
      );
      const [edited, untouched] = await h.service.findAllForAdmin();
      expect(edited.last_modified_by.id).toBe(6);
      expect(untouched.last_modified_by.id).toBe(5);
    });

    it.each([
      ['Ana', null, 'Ana'],
      [null, 'Perez', 'Perez'],
      ['Ana', 'Perez', 'Ana Perez'],
      ['  ', '  ', 'a@x'],
      [null, null, 'a@x'],
      ['', 'Perez', 'Perez'],
    ])(
      'names a user with first=%p last=%p as %p',
      async (first, last, name) => {
        const h = harness();
        h.addRow(1, 'A', {}, { created_by: 5 });
        h.users.push({
          id: 5,
          first_name: first,
          last_name: last,
          email: 'a@x',
        });
        const dto = await h.service.findOneForAdmin(1);
        expect(dto.last_modified_by).toEqual({ id: 5, name, email: 'a@x' });
      },
    );

    it('leaves last_modified_by null when the id matches no user', async () => {
      const h = harness();
      h.addRow(1, 'A', {}, { created_by: 404 });
      expect((await h.service.findOneForAdmin(1)).last_modified_by).toBeNull();
    });

    it('lists only the ACTIVE links that have a portfolio', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addLink(1, 3, false);
      h.addLink(1, 2, true);
      const dto = await h.service.findOneForAdmin(1);
      expect(dto.portfolios).toEqual([
        { id: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22' },
      ]);
    });

    it('publishes the group of a row that stands alone as its own id', async () => {
      const h = harness();
      h.addRow(12, 'A');
      expect((await h.service.findOneForAdmin(12)).group_id).toBe(12);
    });

    it('publishes editorial_status approved when the column is empty', async () => {
      const h = harness();
      h.addRow(1, 'A', { editorial_status: null });
      expect((await h.service.findOneForAdmin(1)).editorial_status).toBe(
        'approved',
      );
    });

    it('GET admin/terms/:id of an unknown id is a 404 with this exact message', async () => {
      const h = harness();
      const error = await h.service.findOneForAdmin(77).catch((e) => e);
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Glossary term 77 was not found');
    });
  });

  // ---------------------------------------------------------------- create

  describe('create', () => {
    it('stores these defaults for a term with only term and definition', async () => {
      const h = harness();
      await h.service.create(
        { term: 'Impact', definition: 'The change.' },
        user,
      );
      expect(h.created.find((c) => c.entity === 'Glossary').plain).toEqual({
        title: 'Impact',
        group_id: null,
        definition: 'The change.',
        source: null,
        sourceUrl: null,
        referenceDate: null,
        alternative_labels: null,
        editorial_status: 'approved',
        applicationName: null,
        show_in_dashboard: false,
      });
    });

    it('defaults show_in_dashboard to false and applicationName to null', async () => {
      const h = harness();
      const dto = await h.service.create({ term: 'A', definition: 'd' }, user);
      expect(dto.show_in_dashboard).toBe(false);
      expect(dto.application_name).toBeNull();
    });

    it('stores show_in_dashboard, application_name and a draft status when sent', async () => {
      const h = harness();
      const dto = await h.service.create(
        {
          term: 'A',
          definition: 'd',
          show_in_dashboard: true,
          application_name: 'PRMS',
          editorial_status: GlossaryEditorialStatus.DRAFT,
        },
        user,
      );
      expect(dto.show_in_dashboard).toBe(true);
      expect(dto.application_name).toBe('PRMS');
      expect(dto.editorial_status).toBe('draft');
    });

    it('trims the definition and collapses the whitespace of the term', async () => {
      const h = harness();
      const dto = await h.service.create(
        { term: '  Impact \t  area ', definition: '  text \n' },
        user,
      );
      expect(dto.term).toBe('Impact area');
      expect(dto.definition).toBe('text');
    });

    it('keeps the inner line breaks of the definition', async () => {
      const h = harness();
      const dto = await h.service.create(
        { term: 'A', definition: ' a\n\nb ' },
        user,
      );
      expect(dto.definition).toBe('a\n\nb');
    });

    it('a whitespace-only term is a 400 "The term is required" and opens no transaction', async () => {
      const h = harness();
      const error = await h.service
        .create({ term: '   ', definition: 'd' }, user)
        .catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('The term is required');
      expect(h.dataSource.transaction).not.toHaveBeenCalled();
    });

    it('a whitespace-only definition is a 400 "The definition is required"', async () => {
      const h = harness();
      const error = await h.service
        .create({ term: 'A', definition: ' \n ' }, user)
        .catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('The definition is required');
    });

    it('the term is checked before the definition', async () => {
      const h = harness();
      const error = await h.service
        .create({ term: '', definition: '' }, user)
        .catch((e) => e);
      expect(error.message).toBe('The term is required');
    });

    it('stamps created_by and is_active on the new row', async () => {
      const h = harness();
      await h.service.create({ term: 'A', definition: 'd' }, user);
      expect(h.savedOf('Glossary')[0].value.auditableFields).toEqual({
        is_active: true,
        created_by: 7,
      });
    });

    it('allows a second active term with the same title when no portfolio is sent', async () => {
      // pinned as-is: the duplicate check only runs when portfolios are given.
      const h = harness();
      h.addRow(1, 'Outcome');
      await expect(
        h.service.create({ term: 'outcome', definition: 'again' }, user),
      ).resolves.toMatchObject({ term: 'outcome' });
      expect(h.rows.size).toBe(2);
    });

    it('detects a duplicate case-insensitively and across whitespace', async () => {
      const h = harness();
      h.addRow(1, 'Outcome');
      h.addLink(1, 3);
      const error = await h.service
        .create(
          { term: '  OUTCOME  ', definition: 'd', portfolio_ids: [3] },
          user,
        )
        .catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
    });

    it('the 409 says this exact text, with the clashing portfolio and record', async () => {
      const h = harness();
      h.addRow(1, 'Outcome');
      h.addLink(1, 3);
      const error = await h.service
        .create({ term: 'outcome', definition: 'd', portfolio_ids: [3] }, user)
        .catch((e) => e);
      expect(error.message).toBe(
        'The term "outcome" already has a version for portfolio 3 (record 1). ' +
          'Two versions of the same term cannot share a portfolio.',
      );
    });

    it('names the FIRST clashing portfolio in the order it was requested', async () => {
      const h = harness();
      h.addRow(1, 'Outcome');
      h.addLink(1, 2);
      h.addLink(1, 3);
      const error = await h.service
        .create(
          { term: 'Outcome', definition: 'd', portfolio_ids: [3, 2] },
          user,
        )
        .catch((e) => e);
      expect(error.message).toContain('for portfolio 3 (record 1)');
    });

    it('does not count an inactive sibling nor an inactive link', async () => {
      const h = harness();
      h.addRow(1, 'Outcome', {}, { is_active: false });
      h.addLink(1, 3);
      h.addRow(2, 'Outcome');
      h.addLink(2, 3, false);
      await expect(
        h.service.create(
          { term: 'Outcome', definition: 'd', portfolio_ids: [3] },
          user,
        ),
      ).resolves.toBeDefined();
    });

    it('a duplicate is refused before anything is written', async () => {
      const h = harness();
      h.addRow(1, 'Outcome');
      h.addLink(1, 3);
      await h.service
        .create({ term: 'Outcome', definition: 'd', portfolio_ids: [3] }, user)
        .catch(() => undefined);
      expect(h.saved).toEqual([]);
    });

    it('an unknown portfolio is a 400 with its id and nothing is written', async () => {
      const h = harness();
      const error = await h.service
        .create({ term: 'A', definition: 'd', portfolio_ids: [3, 9, 8] }, user)
        .catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Unknown portfolio id(s): 9, 8');
      expect(h.saved).toEqual([]);
    });

    it('group_of: an unknown term is a 400, not a 404', async () => {
      const h = harness();
      const error = await h.service
        .create({ term: 'A', definition: 'd', group_of: 55 }, user)
        .catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Glossary term 55 was not found');
    });

    it('group_of: the new row joins the group of the target', async () => {
      const h = harness();
      h.addRow(5, 'Deliverable', { group_id: 42 as any });
      await h.service.create(
        { term: 'Deliverable', definition: 'd', group_of: 5 },
        user,
      );
      expect(
        h.created.find((c) => c.entity === 'Glossary').plain.group_id,
      ).toBe(42);
    });

    it('group_of: a target that stands alone gives its own id as the group', async () => {
      const h = harness();
      h.addRow(5, 'Deliverable');
      await h.service.create(
        { term: 'Deliverable', definition: 'd', group_of: 5 },
        user,
      );
      expect(
        h.created.find((c) => c.entity === 'Glossary').plain.group_id,
      ).toBe(5);
    });

    it('creates and links the portfolios, active, stamped with the user', async () => {
      const h = harness();
      const dto = await h.service.create(
        { term: 'A', definition: 'd', portfolio_ids: [2, 3] },
        user,
      );
      expect(dto.portfolios.map((p) => p.acronym)).toEqual(['P22', 'P25']);
      const links = h.savedOf('GlossaryPortfolio')[0].value;
      expect(links.map((l: any) => l.portfolio_id)).toEqual([2, 3]);
      expect(links[0].auditableFields).toEqual({
        is_active: true,
        created_by: 7,
      });
    });

    it('does not save any link when no portfolio was sent', async () => {
      const h = harness();
      await h.service.create({ term: 'A', definition: 'd' }, user);
      expect(h.savedOf('GlossaryPortfolio')).toEqual([]);
    });

    it('cleans the alternative labels: trimmed, deduplicated, without the term', async () => {
      const h = harness();
      await h.service.create(
        {
          term: 'Impact',
          definition: 'd',
          alternative_labels: [' IA ', 'ia', 'impact', ''],
        },
        user,
      );
      expect(h.created[0].plain.alternative_labels).toBe('["IA"]');
    });
  });

  // ---------------------------------------------------------------- update

  describe('update', () => {
    it('a whitespace-only term is a 400 "The term cannot be empty"', async () => {
      const h = harness();
      h.addRow(1, 'A');
      const error = await h.service
        .update(1, { term: '  ' }, user)
        .catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('The term cannot be empty');
      expect(h.saved).toEqual([]);
    });

    it('a whitespace-only definition is a 400 "The definition cannot be empty"', async () => {
      const h = harness();
      h.addRow(1, 'A');
      const error = await h.service
        .update(1, { definition: '\n ' }, user)
        .catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('The definition cannot be empty');
      expect(h.saved).toEqual([]);
    });

    it('an unknown id is a 404 with the same text as the read', async () => {
      const h = harness();
      const error = await h.service
        .update(5, { term: 'x' }, user)
        .catch((e) => e);
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Glossary term 5 was not found');
    });

    it('changes show_in_dashboard in both directions', async () => {
      const h = harness();
      h.addRow(1, 'A');
      expect(
        (await h.service.update(1, { show_in_dashboard: true }, user))
          .show_in_dashboard,
      ).toBe(true);
      expect(
        (await h.service.update(1, { show_in_dashboard: false }, user))
          .show_in_dashboard,
      ).toBe(false);
    });

    it('changes application_name, and an empty string is stored as the empty string', async () => {
      // pinned as-is: unlike the provenance, application_name is not turned into null.
      const h = harness();
      h.addRow(1, 'A', { applicationName: 'PRMS' });
      expect(
        (await h.service.update(1, { application_name: 'MEL' }, user))
          .application_name,
      ).toBe('MEL');
      expect(
        (await h.service.update(1, { application_name: '' }, user))
          .application_name,
      ).toBe('');
    });

    it('leaves application_name and show_in_dashboard alone when the body does not mention them', async () => {
      const h = harness();
      h.addRow(1, 'A', { applicationName: 'PRMS', show_in_dashboard: true });
      const dto = await h.service.update(1, { definition: 'new' }, user);
      expect(dto.application_name).toBe('PRMS');
      expect(dto.show_in_dashboard).toBe(true);
    });

    it('never touches the editorial status, the active flag or the group', async () => {
      const h = harness();
      h.addRow(
        1,
        'A',
        { editorial_status: GlossaryEditorialStatus.DRAFT, group_id: 9 as any },
        { is_active: false },
      );
      const dto = await h.service.update(
        1,
        { term: 'B', definition: 'x' },
        user,
      );
      expect(dto.editorial_status).toBe('draft');
      expect(dto.is_active).toBe(false);
      expect(dto.group_id).toBe(9);
    });

    it('stamps updated_by with the caller', async () => {
      const h = harness();
      h.addRow(1, 'A');
      await h.service.update(1, { definition: 'x' }, user);
      expect(h.savedOf('Glossary')[0].value.auditableFields.updated_by).toBe(7);
    });

    it('an unknown portfolio fails AFTER the term was saved', async () => {
      // pinned as-is: the row is written first and the portfolios validated
      // second. In production the transaction rolls the write back; what is
      // pinned here is the ORDER of the calls.
      const h = harness();
      h.addRow(1, 'A');
      const error = await h.service
        .update(1, { definition: 'x', portfolio_ids: [99] }, user)
        .catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Unknown portfolio id(s): 99');
      expect(h.log.indexOf('save:Glossary')).toBeGreaterThan(-1);
      expect(h.log.indexOf('save:Glossary')).toBeLessThan(
        h.log.indexOf('find:Portfolio'),
      );
    });

    it('a portfolio clash on the new list also fails after the save', async () => {
      const h = harness();
      h.addRow(1, 'Outcome');
      h.addRow(2, 'Outcome');
      h.addLink(2, 3);
      const error = await h.service
        .update(1, { portfolio_ids: [3] }, user)
        .catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(h.log).toContain('save:Glossary');
    });

    it('renaming checks the portfolios the row holds today when none is sent', async () => {
      const h = harness();
      h.addRow(1, 'Old');
      h.addLink(1, 3);
      h.addRow(2, 'New');
      h.addLink(2, 3);
      const error = await h.service
        .update(1, { term: 'new' }, user)
        .catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
    });

    it('does not run the portfolio sync when portfolio_ids is absent', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addLink(1, 3);
      await h.service.update(1, { definition: 'x' }, user);
      expect(h.savedOf('GlossaryPortfolio')).toEqual([]);
    });

    it('portfolio_ids: [] deactivates every link (the CRUD can empty a term)', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addLink(1, 3);
      const dto = await h.service.update(1, { portfolio_ids: [] }, user);
      expect(dto.portfolios).toEqual([]);
    });

    it('rejects editorial_status in the body at the DTO, with this message', async () => {
      const messages = await refusal(UpdateGlossaryTermDto, {
        editorial_status: 'draft',
      });
      expect(messages).toEqual(['property editorial_status should not exist']);
    });

    it('rejects is_active, group_id and id in the body at the DTO', async () => {
      const messages = await refusal(UpdateGlossaryTermDto, {
        is_active: false,
        group_id: 3,
        id: 5,
      });
      expect(messages).toEqual([
        'property is_active should not exist',
        'property group_id should not exist',
        'property id should not exist',
      ]);
    });

    it('rejects an empty term and an empty definition at the DTO with their own messages', async () => {
      expect(await refusal(UpdateGlossaryTermDto, { term: '' })).toEqual([
        'The term cannot be empty',
      ]);
      expect(await refusal(UpdateGlossaryTermDto, { definition: '' })).toEqual([
        'The definition cannot be empty',
      ]);
    });

    it('accepts an empty body at the DTO: every key is optional', async () => {
      await expect(validate(UpdateGlossaryTermDto, {})).resolves.toBeDefined();
    });
  });

  // ------------------------------------------------------- syncPortfolios

  describe('how the portfolio links are written (syncPortfolios)', () => {
    it('creates a link for a portfolio the term never had', async () => {
      const h = harness();
      h.addRow(1, 'A');
      await h.service.update(1, { portfolio_ids: [3] }, user);
      const made = h.created.find((c) => c.entity === 'GlossaryPortfolio');
      expect(made.plain).toEqual({ glossary_id: 1, portfolio_id: 3 });
      expect(h.links).toHaveLength(1);
      expect(h.links[0].auditableFields).toEqual({
        is_active: true,
        created_by: 7,
      });
    });

    it('reactivates an inactive link instead of creating a second one', async () => {
      const h = harness();
      h.addRow(1, 'A');
      const old = h.addLink(1, 3, false);
      await h.service.update(1, { portfolio_ids: [3] }, user);
      expect(h.created.filter((c) => c.entity === 'GlossaryPortfolio')).toEqual(
        [],
      );
      expect(h.links).toHaveLength(1);
      expect(old.auditableFields.is_active).toBe(true);
      expect(old.auditableFields.updated_by).toBe(7);
    });

    it('deactivates, never deletes, the links that no longer apply', async () => {
      const h = harness();
      h.addRow(1, 'A');
      const gone = h.addLink(1, 2);
      h.addLink(1, 3);
      await h.service.update(1, { portfolio_ids: [3] }, user);
      expect(h.links).toHaveLength(2);
      expect(gone.auditableFields.is_active).toBe(false);
      expect(gone.auditableFields.updated_by).toBe(7);
    });

    it('does not save a link that is already active and wanted', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addLink(1, 3);
      await h.service.update(1, { portfolio_ids: [3] }, user);
      expect(h.savedOf('GlossaryPortfolio')).toEqual([]);
    });

    it('saves the deactivated links first, then the reactivated or created ones, in one call', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addLink(1, 1);
      h.addLink(1, 2, false);
      await h.service.update(1, { portfolio_ids: [2, 3] }, user);
      const calls = h.savedOf('GlossaryPortfolio');
      expect(calls).toHaveLength(1);
      expect(calls[0].value.map((l: any) => l.portfolio_id)).toEqual([1, 2, 3]);
    });

    it('treats a repeated portfolio id as one', async () => {
      const h = harness();
      h.addRow(1, 'A');
      await h.service.update(1, { portfolio_ids: [3, 3, '3' as any] }, user);
      expect(h.links).toHaveLength(1);
    });
  });

  // ------------------------------------------------------------ setStatus

  describe('setStatus (the soft delete)', () => {
    it('deactivates an active term and answers it inactive', async () => {
      const h = harness();
      h.addRow(1, 'A');
      const dto = await h.service.setStatus(1, false, user);
      expect(dto.is_active).toBe(false);
      expect(h.rows.get(1).auditableFields.is_active).toBe(false);
    });

    it('reactivates an inactive term', async () => {
      const h = harness();
      h.addRow(1, 'A', {}, { is_active: false });
      const dto = await h.service.setStatus(1, true, user);
      expect(dto.is_active).toBe(true);
    });

    it('is idempotent: deactivating an inactive term answers inactive and saves again', async () => {
      const h = harness();
      h.addRow(1, 'A', {}, { is_active: false });
      const dto = await h.service.setStatus(1, false, user);
      expect(dto.is_active).toBe(false);
      expect(h.savedOf('Glossary')).toHaveLength(1);
    });

    it('stamps updated_by with the caller', async () => {
      const h = harness();
      h.addRow(1, 'A');
      await h.service.setStatus(1, false, user);
      expect(h.savedOf('Glossary')[0].value.auditableFields.updated_by).toBe(7);
    });

    it('an unknown id is a 404 with this exact message and nothing is saved', async () => {
      const h = harness();
      const error = await h.service.setStatus(9, false, user).catch((e) => e);
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Glossary term 9 was not found');
      expect(h.saved).toEqual([]);
    });

    it('does not touch the portfolio links', async () => {
      const h = harness();
      h.addRow(1, 'A');
      const link = h.addLink(1, 3);
      const dto = await h.service.setStatus(1, false, user);
      expect(link.auditableFields.is_active).toBe(true);
      expect(h.log).not.toContain('save:GlossaryPortfolio');
      expect(h.log).not.toContain('find:GlossaryPortfolio');
      expect(dto.portfolios).toHaveLength(1);
    });

    it('does not touch the editorial status nor the replacement', async () => {
      const h = harness();
      h.addRow(1, 'A', {
        editorial_status: GlossaryEditorialStatus.DEPRECATED,
        replaced_by_id: 2 as any,
      });
      const dto = await h.service.setStatus(1, false, user);
      expect(dto.editorial_status).toBe('deprecated');
      expect(dto.replaced_by_id).toBe(2);
    });

    it('does not touch the title, the definition or the group', async () => {
      const h = harness();
      h.addRow(1, 'A', { group_id: 5 as any });
      const dto = await h.service.setStatus(1, false, user);
      expect([dto.term, dto.definition, dto.group_id]).toEqual([
        'A',
        'definition of A',
        5,
      ]);
    });
  });

  describe('UpdateGlossaryStatusDto', () => {
    it('accepts true and false', async () => {
      await expect(
        validate(UpdateGlossaryStatusDto, { is_active: true }),
      ).resolves.toMatchObject({ is_active: true });
      await expect(
        validate(UpdateGlossaryStatusDto, { is_active: false }),
      ).resolves.toMatchObject({ is_active: false });
    });

    it.each([['yes'], ['true'], [1], [0], [null]])(
      'refuses is_active = %p',
      async (value) => {
        expect(
          await refusal(UpdateGlossaryStatusDto, { is_active: value }),
        ).toEqual(['is_active must be a boolean value']);
      },
    );

    it('refuses a body with no is_active', async () => {
      expect(await refusal(UpdateGlossaryStatusDto, {})).toEqual([
        'is_active must be a boolean value',
      ]);
    });

    it('refuses any other key (forbidNonWhitelisted)', async () => {
      expect(
        await refusal(UpdateGlossaryStatusDto, {
          is_active: true,
          editorial_status: 'draft',
        }),
      ).toEqual(['property editorial_status should not exist']);
    });
  });

  // ------------------------------------------------------ editorial status

  describe('setEditorialStatus', () => {
    const S = GlossaryEditorialStatus;
    const ALL = [S.DRAFT, S.IN_REVIEW, S.APPROVED, S.DEPRECATED];
    const set = (h: ReturnType<typeof harness>, id: number, dto: any) =>
      h.service.setEditorialStatus(id, dto, user);

    const matrix = ALL.flatMap((from) => ALL.map((to) => [from, to]));
    it.each(matrix)('moves a term from %s to %s', async (from, to) => {
      // pinned as-is: every one of the 16 moves is allowed, there is no
      // transition rule — a deprecated term can go back to draft.
      const h = harness();
      h.addRow(1, 'A', { editorial_status: from });
      const dto = await set(h, 1, { status: to });
      expect(dto.editorial_status).toBe(to);
      expect(dto.replaced_by_id).toBeNull();
    });

    it('an unknown id is a 404 with the usual text', async () => {
      const h = harness();
      const error = await set(h, 9, { status: S.APPROVED }).catch((e) => e);
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Glossary term 9 was not found');
    });

    it('stamps updated_by and saves once', async () => {
      const h = harness();
      h.addRow(1, 'A');
      await set(h, 1, { status: S.IN_REVIEW });
      expect(h.savedOf('Glossary')).toHaveLength(1);
      expect(h.savedOf('Glossary')[0].value.auditableFields.updated_by).toBe(7);
    });

    it('does not change is_active, the portfolios or the text', async () => {
      const h = harness();
      h.addRow(1, 'A', {}, { is_active: false });
      h.addLink(1, 3);
      const dto = await set(h, 1, { status: S.DEPRECATED });
      expect(dto.is_active).toBe(false);
      expect(dto.portfolios).toHaveLength(1);
      expect(dto.term).toBe('A');
      expect(h.log).not.toContain('save:GlossaryPortfolio');
    });

    it('deprecates without a replacement', async () => {
      const h = harness();
      h.addRow(1, 'A');
      const dto = await set(h, 1, { status: S.DEPRECATED });
      expect(dto.editorial_status).toBe('deprecated');
      expect(dto.replaced_by_id).toBeNull();
    });

    it('replaced_by_id null is the same as absent', async () => {
      const h = harness();
      h.addRow(1, 'A');
      const dto = await set(h, 1, {
        status: S.DEPRECATED,
        replaced_by_id: null,
      });
      expect(dto.replaced_by_id).toBeNull();
      // only the term itself is read: no replacement is looked up.
      expect(h.log.filter((l) => l === 'findOne:Glossary')).toHaveLength(2);
    });

    it('deprecates pointing to an active, approved replacement', async () => {
      const h = harness();
      h.addRow(1, 'Old');
      h.addRow(2, 'New');
      const dto = await set(h, 1, { status: S.DEPRECATED, replaced_by_id: 2 });
      expect(dto.replaced_by_id).toBe(2);
    });

    it('refuses a replacement with any status but deprecated, with this message', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'B');
      for (const status of [S.DRAFT, S.IN_REVIEW, S.APPROVED]) {
        const error = await set(h, 1, { status, replaced_by_id: 2 }).catch(
          (e) => e,
        );
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'Only a deprecated term can point to a replacement',
        );
      }
      expect(h.saved).toEqual([]);
    });

    it('refuses a term that replaces itself', async () => {
      const h = harness();
      h.addRow(1, 'A');
      const error = await set(h, 1, {
        status: S.DEPRECATED,
        replaced_by_id: 1,
      }).catch((e) => e);
      expect(error.message).toBe('A term cannot replace itself');
    });

    it('checks "only deprecated" before "itself" and before "not found"', async () => {
      const h = harness();
      h.addRow(1, 'A');
      expect(
        (
          await set(h, 1, { status: S.APPROVED, replaced_by_id: 1 }).catch(
            (e) => e,
          )
        ).message,
      ).toBe('Only a deprecated term can point to a replacement');
      expect(
        (
          await set(h, 1, { status: S.APPROVED, replaced_by_id: 404 }).catch(
            (e) => e,
          )
        ).message,
      ).toBe('Only a deprecated term can point to a replacement');
    });

    it('refuses a replacement that does not exist, quoting its id', async () => {
      const h = harness();
      h.addRow(1, 'A');
      const error = await set(h, 1, {
        status: S.DEPRECATED,
        replaced_by_id: 404,
      }).catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('The replacement term 404 was not found');
    });

    it('replaced_by_id 0 is not "absent": it is looked up and not found', async () => {
      // pinned as-is: `?? null` keeps 0.
      const h = harness();
      h.addRow(1, 'A');
      const error = await set(h, 1, {
        status: S.DEPRECATED,
        replaced_by_id: 0,
      }).catch((e) => e);
      expect(error.message).toBe('The replacement term 0 was not found');
    });

    it.each([[S.DRAFT], [S.IN_REVIEW], [S.DEPRECATED]])(
      'refuses a replacement that is %s',
      async (status) => {
        const h = harness();
        h.addRow(1, 'Old');
        h.addRow(2, 'New', { editorial_status: status });
        const error = await set(h, 1, {
          status: S.DEPRECATED,
          replaced_by_id: 2,
        }).catch((e) => e);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'The replacement has to be an active, approved term',
        );
      },
    );

    it('refuses a replacement that is inactive', async () => {
      const h = harness();
      h.addRow(1, 'Old');
      h.addRow(2, 'New', {}, { is_active: false });
      const error = await set(h, 1, {
        status: S.DEPRECATED,
        replaced_by_id: 2,
      }).catch((e) => e);
      expect(error.message).toBe(
        'The replacement has to be an active, approved term',
      );
    });

    it('treats a replacement with an empty editorial status as approved', async () => {
      const h = harness();
      h.addRow(1, 'Old');
      h.addRow(2, 'New', { editorial_status: null });
      await expect(
        set(h, 1, { status: S.DEPRECATED, replaced_by_id: 2 }),
      ).resolves.toMatchObject({ replaced_by_id: 2 });
    });

    it('moving a term out of deprecated clears its replacement', async () => {
      const h = harness();
      h.addRow(1, 'Old', {
        editorial_status: S.DEPRECATED,
        replaced_by_id: 2 as any,
      });
      h.addRow(2, 'New');
      const dto = await set(h, 1, { status: S.APPROVED });
      expect(dto.replaced_by_id).toBeNull();
    });

    it('deprecating again without a replacement clears the one it had', async () => {
      // pinned as-is: the replacement is rewritten on every call.
      const h = harness();
      h.addRow(1, 'Old', {
        editorial_status: S.DEPRECATED,
        replaced_by_id: 2 as any,
      });
      h.addRow(2, 'New');
      const dto = await set(h, 1, { status: S.DEPRECATED });
      expect(dto.replaced_by_id).toBeNull();
    });

    it('allows a chain A -> B -> C: B is deprecated after A already points to it', async () => {
      // pinned as-is: A's replacement is only checked at the moment A is set.
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'B');
      h.addRow(3, 'C');
      await set(h, 1, { status: S.DEPRECATED, replaced_by_id: 2 });
      const b = await set(h, 2, { status: S.DEPRECATED, replaced_by_id: 3 });
      expect(b.replaced_by_id).toBe(3);
      expect(h.rows.get(1).replaced_by_id).toBe(2);
      expect(h.rows.get(2).editorial_status).toBe('deprecated');
    });

    it('deprecating the replacement does not revalidate nor save the term that points at it', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'B');
      h.addRow(3, 'C');
      await set(h, 1, { status: S.DEPRECATED, replaced_by_id: 2 });
      h.saved.length = 0;
      await set(h, 2, { status: S.DEPRECATED, replaced_by_id: 3 });
      expect(h.savedOf('Glossary')).toHaveLength(1);
      expect(h.savedOf('Glossary')[0].value.id).toBe(2);
    });

    it('a replacement deactivated later keeps being pointed at', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'B');
      await set(h, 1, { status: S.DEPRECATED, replaced_by_id: 2 });
      await h.service.setStatus(2, false, user);
      const a = await h.service.findOneForAdmin(1);
      expect(a.replaced_by_id).toBe(2);
      expect(h.rows.get(2).auditableFields.is_active).toBe(false);
    });

    it('allows two terms to be replaced by the same one, and a cycle A -> B -> A through two calls', async () => {
      // pinned as-is: B must be approved when A points at it, but nothing stops
      // B being made approved again and pointed back at A afterwards.
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'B');
      await set(h, 1, { status: S.DEPRECATED, replaced_by_id: 2 });
      await set(h, 1, { status: S.APPROVED });
      await set(h, 2, { status: S.DEPRECATED, replaced_by_id: 1 });
      expect(h.rows.get(2).replaced_by_id).toBe(1);
    });
  });

  describe('UpdateGlossaryEditorialStatusDto', () => {
    it.each(['draft', 'in_review', 'approved', 'deprecated'])(
      'accepts status %s',
      async (status) => {
        await expect(
          validate(UpdateGlossaryEditorialStatusDto, { status }),
        ).resolves.toMatchObject({ status });
      },
    );

    it.each([['published'], ['APPROVED'], [''], [null], [3]])(
      'refuses status %p with the list of values',
      async (status) => {
        expect(
          await refusal(UpdateGlossaryEditorialStatusDto, { status }),
        ).toEqual([
          'status must be one of the following values: draft, in_review, approved, deprecated',
        ]);
      },
    );

    it('refuses a body with no status', async () => {
      expect(await refusal(UpdateGlossaryEditorialStatusDto, {})).toEqual([
        'status must be one of the following values: draft, in_review, approved, deprecated',
      ]);
    });

    it('accepts replaced_by_id null and absent', async () => {
      await expect(
        validate(UpdateGlossaryEditorialStatusDto, {
          status: 'deprecated',
          replaced_by_id: null,
        }),
      ).resolves.toMatchObject({ replaced_by_id: null });
      await expect(
        validate(UpdateGlossaryEditorialStatusDto, { status: 'deprecated' }),
      ).resolves.toBeDefined();
    });

    it('reads replaced_by_id "5" (a string) as the number 5', async () => {
      const dto: any = await validate(UpdateGlossaryEditorialStatusDto, {
        status: 'deprecated',
        replaced_by_id: '5',
      });
      expect(dto.replaced_by_id).toBe(5);
    });

    it.each([['abc'], [1.5], [{}]])(
      'refuses replaced_by_id %p',
      async (value) => {
        expect(
          await refusal(UpdateGlossaryEditorialStatusDto, {
            status: 'deprecated',
            replaced_by_id: value,
          }),
        ).toEqual(['replaced_by_id must be an integer number']);
      },
    );

    it('refuses any other key', async () => {
      expect(
        await refusal(UpdateGlossaryEditorialStatusDto, {
          status: 'draft',
          note: 'x',
        }),
      ).toEqual(['property note should not exist']);
    });
  });

  // ------------------------------------------------------------ splitVersion

  describe('splitVersion', () => {
    const SOURCE_EXTRA: Partial<Glossary> = {
      definition: 'old definition',
      source: 'Old source',
      sourceUrl: 'https://old.org',
      referenceDate: '2025-01-01',
      alternative_labels: '["IA","ie"]',
      applicationName: 'PRMS',
      show_in_dashboard: true,
      editorial_status: GlossaryEditorialStatus.DRAFT,
    };

    const seed = (extra: Partial<Glossary> = SOURCE_EXTRA) => {
      const h = harness();
      h.addRow(1, 'Outcome', extra);
      h.addLink(1, 2);
      h.addLink(1, 3);
      return h;
    };
    const split = (h: ReturnType<typeof harness>, dto: any) =>
      h.service.splitVersion(1, dto, user);
    const createdPlain = (h: ReturnType<typeof harness>) =>
      h.created.find((c) => c.entity === 'Glossary').plain;

    it('creates the new row WITHOUT editorial_status, so the database default applies', async () => {
      // pinned as-is: the source is a draft, the version is born `approved` (the
      // column default) and therefore PUBLIC.
      const h = seed();
      await split(h, { definition: 'new', portfolio_ids: [3] });
      expect('editorial_status' in createdPlain(h)).toBe(false);
      expect(
        h.savedOf('Glossary').at(-1).value.editorial_status,
      ).toBeUndefined();
    });

    it('the exact keys handed to create are these ten', async () => {
      const h = seed();
      await split(h, { definition: ' new ', portfolio_ids: [3] });
      expect(createdPlain(h)).toEqual({
        title: 'Outcome',
        group_id: 1,
        definition: 'new',
        source: 'Old source',
        sourceUrl: 'https://old.org',
        referenceDate: '2025-01-01',
        alternative_labels: '["IA","ie"]',
        applicationName: 'PRMS',
        show_in_dashboard: true,
      });
      expect(Object.keys(createdPlain(h))).toHaveLength(9);
    });

    it('also leaves out replaced_by_id: a split of a deprecated term is not deprecated', async () => {
      const h = seed({
        ...SOURCE_EXTRA,
        editorial_status: GlossaryEditorialStatus.DEPRECATED,
        replaced_by_id: 9 as any,
      });
      await split(h, { definition: 'new', portfolio_ids: [3] });
      expect('replaced_by_id' in createdPlain(h)).toBe(false);
    });

    it('copies applicationName, show_in_dashboard and the title from the source', async () => {
      const h = seed();
      const { version } = await split(h, {
        definition: 'new',
        portfolio_ids: [3],
      });
      expect(version.term).toBe('Outcome');
      expect(version.application_name).toBe('PRMS');
      expect(version.show_in_dashboard).toBe(true);
    });

    it.each([
      ['source', 'Old source'],
      ['source_url', 'https://old.org'],
      ['reference_date', '2025-01-01'],
    ])(
      'keeps the source %s when the body sends it empty',
      async (key, kept) => {
        // pinned as-is: `toNullableText(dto) ?? source.value` — an empty string
        // becomes null and falls back, so a split cannot CLEAR provenance.
        const h = seed();
        await split(h, { definition: 'new', portfolio_ids: [3], [key]: '' });
        const plain = createdPlain(h);
        const column = {
          source: 'source',
          source_url: 'sourceUrl',
          reference_date: 'referenceDate',
        }[key];
        expect(plain[column]).toBe(kept);
      },
    );

    it('overrides the provenance the body does send, trimmed', async () => {
      const h = seed();
      await split(h, {
        definition: 'new',
        portfolio_ids: [3],
        source: ' New source ',
        source_url: ' https://new.org ',
        reference_date: '2026-02-03',
      });
      const plain = createdPlain(h);
      expect(plain.source).toBe('New source');
      expect(plain.sourceUrl).toBe('https://new.org');
      expect(plain.referenceDate).toBe('2026-02-03');
    });

    it('copies the raw label column when the body sends none', async () => {
      const h = seed();
      await split(h, { definition: 'new', portfolio_ids: [3] });
      expect(createdPlain(h).alternative_labels).toBe('["IA","ie"]');
    });

    it('an empty alternative_labels in the body clears them on the version only', async () => {
      const h = seed();
      await split(h, {
        definition: 'new',
        portfolio_ids: [3],
        alternative_labels: [],
      });
      expect(createdPlain(h).alternative_labels).toBeNull();
      expect(h.rows.get(1).alternative_labels).toBe('["IA","ie"]');
    });

    it('cleans new labels: trimmed, no duplicates, without the title', async () => {
      const h = seed();
      await split(h, {
        definition: 'new',
        portfolio_ids: [3],
        alternative_labels: [' X ', 'x', 'OUTCOME', 'Y'],
      });
      expect(createdPlain(h).alternative_labels).toBe('["X","Y"]');
    });

    it('joins the group of the source: its group_id, or its own id when alone', async () => {
      const h = seed();
      await split(h, { definition: 'new', portfolio_ids: [3] });
      expect(createdPlain(h).group_id).toBe(1);
      const h2 = seed({ ...SOURCE_EXTRA, group_id: 42 as any });
      await split(h2, { definition: 'new', portfolio_ids: [3] });
      expect(createdPlain(h2).group_id).toBe(42);
    });

    it('records where the version came from, with the user and the active flag', async () => {
      const h = seed();
      await split(h, { definition: 'new', portfolio_ids: [3, 3] });
      expect(h.savedOf('Glossary').at(-1).value.auditableFields).toEqual({
        is_active: true,
        created_by: 7,
        modification_justification:
          'Split from glossary term 1 to hold its own definition for portfolio(s) 3',
      });
    });

    it('stamps updated_by on the source and moves the portfolio links', async () => {
      const h = seed();
      const { source, version } = await split(h, {
        definition: 'new',
        portfolio_ids: [3],
      });
      expect(h.savedOf('Glossary')[0].value.auditableFields.updated_by).toBe(7);
      expect(source.portfolios.map((p) => p.id)).toEqual([2]);
      expect(version.portfolios.map((p) => p.id)).toEqual([3]);
      const old = h.links.find(
        (l) => l.glossary_id === 1 && l.portfolio_id === 3,
      );
      expect(old.auditableFields.is_active).toBe(false);
      expect(old.auditableFields.updated_by).toBe(7);
    });

    it('answers exactly { source, version }, the source before the version', async () => {
      const h = seed();
      const result = await split(h, { definition: 'new', portfolio_ids: [3] });
      expect(Object.keys(result)).toEqual(['source', 'version']);
      expect(result.source.id).toBe(1);
      expect(result.version.id).toBeGreaterThan(1);
      expect(result.version.definition).toBe('new');
      expect(result.source.definition).toBe('old definition');
    });

    it('leaves the source with the editorial status it had', async () => {
      const h = seed();
      const { source } = await split(h, {
        definition: 'new',
        portfolio_ids: [3],
      });
      expect(source.editorial_status).toBe('draft');
    });

    it('a blank definition is a 400 checked BEFORE the term is looked up', async () => {
      const h = harness();
      const error = await h.service
        .splitVersion(
          404,
          { definition: '  ', portfolio_ids: [3] } as any,
          user,
        )
        .catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('The definition is required');
      expect(h.dataSource.transaction).not.toHaveBeenCalled();
    });

    it('an unknown term is a 404', async () => {
      const h = harness();
      const error = await h.service
        .splitVersion(404, { definition: 'x', portfolio_ids: [3] } as any, user)
        .catch((e) => e);
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Glossary term 404 was not found');
    });

    it('no portfolio to move is a 400 with this message', async () => {
      const h = seed();
      for (const portfolio_ids of [undefined, []]) {
        const error = await split(h, { definition: 'x', portfolio_ids }).catch(
          (e) => e,
        );
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'At least one portfolio has to move to the new version',
        );
      }
    });

    it('a portfolio the term does not cover is a 400 listing them', async () => {
      const h = seed();
      const error = await split(h, {
        definition: 'x',
        portfolio_ids: [3, 9, 8],
      }).catch((e) => e);
      expect(error.message).toBe(
        'The term does not cover portfolio(s) 9, 8, so they cannot be split off it. ' +
          'Add a version for them instead.',
      );
    });

    it('moving every portfolio is a 400 with this message', async () => {
      const h = seed();
      const error = await split(h, {
        definition: 'x',
        portfolio_ids: [2, 3],
      }).catch((e) => e);
      expect(error.message).toBe(
        'The split would leave the term with no portfolio. Editing it applies to all of them, which is what you want here.',
      );
      expect(h.saved).toEqual([]);
    });

    it('an inactive link does not count as covered', async () => {
      const h = harness();
      h.addRow(1, 'Outcome');
      h.addLink(1, 2);
      h.addLink(1, 3, false);
      const error = await split(h, {
        definition: 'x',
        portfolio_ids: [3],
      }).catch((e) => e);
      expect(error.message).toMatch(/does not cover portfolio\(s\) 3/);
    });
  });

  describe('SplitGlossaryTermDto', () => {
    it('accepts a definition with portfolios and the provenance fields', async () => {
      await expect(
        validate(SplitGlossaryTermDto, {
          definition: 'x',
          portfolio_ids: [3],
          source: 's',
          source_url: 'u',
          reference_date: '2026-01-01',
          alternative_labels: ['a'],
          show_in_dashboard: true,
          application_name: 'PRMS',
        }),
      ).resolves.toBeDefined();
    });

    it('does not require portfolio_ids at the DTO (the service does)', async () => {
      await expect(
        validate(SplitGlossaryTermDto, { definition: 'x' }),
      ).resolves.toBeDefined();
    });

    it('refuses a missing definition with its own message', async () => {
      expect(
        await refusal(SplitGlossaryTermDto, { portfolio_ids: [3] }),
      ).toEqual([
        'The definition of the new version is required',
        'definition must be a string',
      ]);
    });

    it.each([
      ['term'],
      ['editorial_status'],
      ['group_of'],
      ['is_active'],
      ['into_id'],
    ])('refuses the key %s, which a split does not take', async (key) => {
      expect(
        await refusal(SplitGlossaryTermDto, { definition: 'x', [key]: 'v' }),
      ).toEqual([`property ${key} should not exist`]);
    });
  });

  // --------------------------------------------------------------- mergeInto

  describe('mergeInto', () => {
    const seed = () => {
      const h = harness();
      h.addRow(1, 'Outcome', {
        editorial_status: GlossaryEditorialStatus.IN_REVIEW,
      });
      h.addRow(2, 'Outcome');
      h.addLink(1, 2);
      h.addLink(2, 3);
      return h;
    };

    it('answers exactly { target, merged }, the target first', async () => {
      const h = seed();
      const result = await h.service.mergeInto(1, 2, user);
      expect(Object.keys(result)).toEqual(['target', 'merged']);
      expect(result.target.id).toBe(2);
      expect(result.merged.id).toBe(1);
    });

    it('moves the portfolios onto the target and deactivates the source', async () => {
      const h = seed();
      const { target, merged } = await h.service.mergeInto(1, 2, user);
      expect(target.portfolios.map((p) => p.id).sort()).toEqual([2, 3]);
      expect(merged.portfolios).toEqual([]);
      expect(merged.is_active).toBe(false);
    });

    it('stamps updated_by on the source and on the target', async () => {
      const h = seed();
      await h.service.mergeInto(1, 2, user);
      expect(h.rows.get(1).auditableFields.updated_by).toBe(7);
      expect(h.rows.get(2).auditableFields.updated_by).toBe(7);
    });

    it('writes the justification on the source, listing the moved portfolios', async () => {
      const h = seed();
      await h.service.mergeInto(1, 2, user);
      expect(h.rows.get(1).auditableFields.modification_justification).toBe(
        'Merged into glossary term 2; its portfolio(s) 2 moved there',
      );
    });

    it('writes "(none)" when the source held no portfolio', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'A');
      await h.service.mergeInto(1, 2, user);
      expect(h.rows.get(1).auditableFields.modification_justification).toBe(
        'Merged into glossary term 2; its portfolio(s) (none) moved there',
      );
    });

    it('keeps the editorial status of both rows and does not touch the target is_active', async () => {
      const h = seed();
      const { target, merged } = await h.service.mergeInto(1, 2, user);
      expect(merged.editorial_status).toBe('in_review');
      expect(target.editorial_status).toBe('approved');
      expect(target.is_active).toBe(true);
    });

    it('merging into itself is a 400 and opens no transaction', async () => {
      const h = seed();
      const error = await h.service.mergeInto(1, 1, user).catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('A term cannot be merged into itself');
      expect(h.dataSource.transaction).not.toHaveBeenCalled();
    });

    it('compares the ids as numbers: "1" and 1 are the same term', async () => {
      const h = seed();
      await expect(h.service.mergeInto('1' as any, 1, user)).rejects.toThrow(
        'A term cannot be merged into itself',
      );
    });

    it('an unknown source is a 404 naming the source', async () => {
      const h = seed();
      const error = await h.service.mergeInto(404, 2, user).catch((e) => e);
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Glossary term 404 was not found');
    });

    it('an unknown target is a 404 naming the target', async () => {
      const h = seed();
      const error = await h.service.mergeInto(1, 404, user).catch((e) => e);
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Glossary term 404 was not found');
    });

    it('when both are unknown the SOURCE is the one reported', async () => {
      const h = harness();
      const error = await h.service.mergeInto(7, 8, user).catch((e) => e);
      expect(error.message).toBe('Glossary term 7 was not found');
    });

    it('an inactive target is a 409 with this message', async () => {
      const h = seed();
      h.rows.get(2).auditableFields.is_active = false;
      const error = await h.service.mergeInto(1, 2, user).catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toBe(
        'Glossary term 2 is inactive. Activate it before merging into it, ' +
          'or the portfolios that move there stop showing in the public glossary.',
      );
    });

    it('a shared portfolio is a 409 with this message and nothing is written', async () => {
      const h = seed();
      h.addLink(1, 3);
      const error = await h.service.mergeInto(1, 2, user).catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toBe(
        'Both terms cover portfolio(s) 3. Remove the overlap before merging, ' +
          'so no definition is dropped without anyone noticing.',
      );
      expect(h.saved).toEqual([]);
    });

    it('merging into a DRAFT or DEPRECATED target is allowed', async () => {
      // pinned as-is: only is_active is checked, not the editorial status.
      const h = seed();
      h.rows.get(2).editorial_status = GlossaryEditorialStatus.DRAFT;
      await expect(h.service.mergeInto(1, 2, user)).resolves.toBeDefined();
    });
  });

  // ------------------------------------------------------- setGroup / clearGroup

  describe('setGroup', () => {
    it('refuses a term as a version of itself, before any transaction', async () => {
      const h = harness();
      const error = await h.service.setGroup(1, 1, user).catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('A term cannot be a version of itself');
      expect(h.dataSource.transaction).not.toHaveBeenCalled();
    });

    it('an unknown row is a 404, then an unknown target', async () => {
      const h = harness();
      h.addRow(2, 'B');
      expect(
        (await h.service.setGroup(1, 2, user).catch((e) => e)).message,
      ).toBe('Glossary term 1 was not found');
      expect(
        (await h.service.setGroup(2, 1, user).catch((e) => e)).message,
      ).toBe('Glossary term 1 was not found');
      expect(
        await h.service.setGroup(2, 1, user).catch((e) => e),
      ).toBeInstanceOf(NotFoundException);
    });

    it('is a no-op when both rows already share a group: nothing is saved', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'A', { group_id: 1 as any });
      const dto = await h.service.setGroup(2, 1, user);
      expect(dto.group_id).toBe(1);
      expect(h.saved).toEqual([]);
      expect(h.rows.get(2).auditableFields.updated_by).toBeNull();
    });

    it('moves a lone row into the group of the target', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'A', { group_id: 1 as any });
      h.addRow(3, 'B');
      const dto = await h.service.setGroup(3, 1, user);
      expect(dto.group_id).toBe(1);
      expect(h.rows.get(3).group_id).toBe(1);
      expect(h.rows.get(1).group_id).toBeNull();
    });

    it('moves the WHOLE group of the row: both groups become one', async () => {
      // pinned as-is: setGroup(1 -> 3) rewrites group_id of 1 AND of its member 2,
      // so the anchor 1 ends up pointing at 3.
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'A', { group_id: 1 as any });
      h.addRow(3, 'B');
      await h.service.setGroup(1, 3, user);
      expect(h.rows.get(1).group_id).toBe(3);
      expect(h.rows.get(2).group_id).toBe(3);
      expect(h.rows.get(3).group_id).toBeNull();
      const saved = h.savedOf('Glossary');
      expect(saved).toHaveLength(1);
      expect(saved[0].value.map((r: any) => r.id)).toEqual([1, 2]);
    });

    it('stamps updated_by on every row that moved, not on the target', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'A', { group_id: 1 as any });
      h.addRow(3, 'B');
      await h.service.setGroup(1, 3, user);
      expect(h.rows.get(1).auditableFields.updated_by).toBe(7);
      expect(h.rows.get(2).auditableFields.updated_by).toBe(7);
      expect(h.rows.get(3).auditableFields.updated_by).toBeNull();
    });

    it('relates two rows with different titles', async () => {
      const h = harness();
      h.addRow(1, 'Alpha');
      h.addRow(2, 'Beta');
      await expect(h.service.setGroup(2, 1, user)).resolves.toMatchObject({
        group_id: 1,
      });
    });

    it('refuses two ACTIVE rows that cover the same portfolio, with this message', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'A');
      h.addLink(1, 3);
      h.addLink(2, 3);
      const error = await h.service.setGroup(2, 1, user).catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toBe(
        'Term 2 and term 1 both cover portfolio 3, so they cannot be two versions of the same concept.',
      );
      expect(h.saved).toEqual([]);
    });

    it('does not count an inactive row nor an inactive link as a clash', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'A', {}, { is_active: false });
      h.addLink(1, 3);
      h.addLink(2, 3);
      await expect(h.service.setGroup(2, 1, user)).resolves.toBeDefined();
    });

    it('does not look at the editorial status', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'A', { editorial_status: GlossaryEditorialStatus.DRAFT });
      await expect(h.service.setGroup(2, 1, user)).resolves.toBeDefined();
    });
  });

  describe('clearGroup', () => {
    it('an unknown id is a 404 with the usual text', async () => {
      const h = harness();
      const error = await h.service.clearGroup(5, user).catch((e) => e);
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Glossary term 5 was not found');
    });

    it('sets group_id to null and the group of the row becomes its own id', async () => {
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'A', { group_id: 1 as any });
      const dto = await h.service.clearGroup(2, user);
      expect(h.rows.get(2).group_id).toBeNull();
      expect(dto.group_id).toBe(2);
    });

    it('stamps updated_by', async () => {
      const h = harness();
      h.addRow(1, 'A', { group_id: 9 as any });
      await h.service.clearGroup(1, user);
      expect(h.savedOf('Glossary')[0].value.auditableFields.updated_by).toBe(7);
    });

    it('on the anchor of a group changes nothing for its members', async () => {
      // pinned as-is: the anchor already has group_id null; the members keep
      // pointing at it and the group survives.
      const h = harness();
      h.addRow(1, 'A');
      h.addRow(2, 'A', { group_id: 1 as any });
      await h.service.clearGroup(1, user);
      expect(h.rows.get(2).group_id).toBe(1);
    });

    it('saves even when the row had no group (a write that changes nothing)', async () => {
      const h = harness();
      h.addRow(1, 'A');
      await h.service.clearGroup(1, user);
      expect(h.savedOf('Glossary')).toHaveLength(1);
    });
  });

  describe('GlossaryTermRelationDto', () => {
    it('reads into_id "5" (a string) as the number 5', async () => {
      const dto: any = await validate(GlossaryTermRelationDto, {
        into_id: '5',
      });
      expect(dto.into_id).toBe(5);
    });

    it.each([['abc'], [1.5], [null], [undefined]])(
      'refuses into_id %p',
      async (value) => {
        expect(
          await refusal(GlossaryTermRelationDto, { into_id: value }),
        ).toEqual(['into_id must be an integer number']);
      },
    );

    it('refuses any other key', async () => {
      expect(
        await refusal(GlossaryTermRelationDto, { into_id: 1, x: 1 }),
      ).toEqual(['property x should not exist']);
    });
  });

  // ------------------------------------------------------------- controller

  describe('the controller hands the service exactly these arguments', () => {
    const service: any = {
      setStatus: jest.fn(),
      setEditorialStatus: jest.fn(),
      splitVersion: jest.fn(),
      mergeInto: jest.fn(),
      setGroup: jest.fn(),
      clearGroup: jest.fn(),
      bulkPreview: jest.fn(),
      bulkImport: jest.fn(),
      findOneForAdmin: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const controller = new GlossaryAdminController(service);
    beforeEach(() => jest.clearAllMocks());

    it('setStatus passes only the boolean, not the DTO', () => {
      controller.setStatus(5, { is_active: false }, user);
      expect(service.setStatus).toHaveBeenCalledWith(5, false, user);
    });

    it('setEditorialStatus passes the DTO whole', () => {
      const dto = {
        status: GlossaryEditorialStatus.DEPRECATED,
        replaced_by_id: 9,
      };
      controller.setEditorialStatus(5, dto, user);
      expect(service.setEditorialStatus).toHaveBeenCalledWith(5, dto, user);
    });

    it('merge passes into_id, group passes into_id, ungroup passes nothing else', () => {
      controller.merge(5, { into_id: 9 }, user);
      controller.group(5, { into_id: 9 }, user);
      controller.ungroup(5, user);
      expect(service.mergeInto).toHaveBeenCalledWith(5, 9, user);
      expect(service.setGroup).toHaveBeenCalledWith(5, 9, user);
      expect(service.clearGroup).toHaveBeenCalledWith(5, user);
    });

    it('versions passes the DTO whole', () => {
      const dto = { definition: 'x', portfolio_ids: [3] };
      controller.splitVersion(5, dto as any, user);
      expect(service.splitVersion).toHaveBeenCalledWith(5, dto, user);
    });

    it('bulk preview takes no user, bulk import takes it', () => {
      const dto: any = { rows: [] };
      controller.bulkPreview(dto);
      controller.bulkImport(dto, user);
      expect(service.bulkPreview).toHaveBeenCalledWith(dto);
      expect(service.bulkPreview.mock.calls[0]).toHaveLength(1);
      expect(service.bulkImport).toHaveBeenCalledWith(dto, user);
    });

    it('create and update pass the body and the user', () => {
      controller.create({ term: 'a', definition: 'b' }, user);
      controller.update(5, { definition: 'c' }, user);
      expect(service.create).toHaveBeenCalledWith(
        { term: 'a', definition: 'b' },
        user,
      );
      expect(service.update).toHaveBeenCalledWith(5, { definition: 'c' }, user);
    });

    it('lists with show=all when the query has none, and passes the rest through', () => {
      service.findAllForAdmin = jest.fn();
      controller.findAll(undefined);
      controller.findAll(null);
      controller.findAll('foo' as any);
      expect(
        service.findAllForAdmin.mock.calls.map((c: any[]) => c[0]),
      ).toEqual(['all', 'all', 'foo']);
    });

    it('carries no @ApiOperation: the admin surface is out of OpenAPI as a whole', () => {
      for (const name of [
        'findAll',
        'findOne',
        'create',
        'update',
        'setStatus',
        'bulkImport',
      ]) {
        expect(
          Reflect.getMetadata(
            DECORATORS.API_OPERATION,
            GlossaryAdminController.prototype[name],
          ),
        ).toBeUndefined();
      }
    });
  });

  // ------------------------------------------------------------------- bulk

  describe('bulk preview and import', () => {
    const rowOf = (
      term: string,
      definition = `def of ${term}`,
      extra: any = {},
    ) => ({
      term,
      definition,
      ...extra,
    });
    const preview = (h: ReturnType<typeof harness>, dto: any) =>
      h.service.bulkPreview(dto);
    const importing = (h: ReturnType<typeof harness>, dto: any) =>
      h.service.bulkImport(dto, user);

    describe('what a preview answers', () => {
      it('is { summary, applied: false, rows }, in this order, and writes nothing', async () => {
        const h = harness();
        const result = await preview(h, { rows: [rowOf('A')] });
        expect(Object.keys(result)).toEqual(['summary', 'applied', 'rows']);
        expect(result.applied).toBe(false);
        expect(h.saved).toEqual([]);
        expect(h.dataSource.transaction).not.toHaveBeenCalled();
      });

      it('the summary has these six counters, in this order', async () => {
        const h = harness();
        const { summary } = await preview(h, { rows: [rowOf('A')] });
        expect(Object.keys(summary)).toEqual([
          'total',
          'to_create',
          'to_update',
          'to_reactivate',
          'skipped',
          'invalid',
        ]);
        expect(summary).toEqual({
          total: 1,
          to_create: 1,
          to_update: 0,
          to_reactivate: 0,
          skipped: 0,
          invalid: 0,
        });
      });

      it('a row to create has these ten keys, in this order', async () => {
        const h = harness();
        const { rows } = await preview(h, { rows: [rowOf('A')] });
        expect(Object.keys(rows[0])).toEqual([
          'index',
          'term',
          'definition',
          'source',
          'source_url',
          'reference_date',
          'alternative_labels',
          'action',
          'glossary_id',
          'portfolios',
        ]);
        expect(rows[0]).toEqual({
          index: 1,
          term: 'A',
          definition: 'def of A',
          source: null,
          source_url: null,
          reference_date: null,
          alternative_labels: null,
          action: 'create',
          glossary_id: null,
          portfolios: [],
        });
      });

      it('a row that updates adds current_definition and message at the end', async () => {
        const h = harness();
        h.addRow(5, 'A');
        const { rows } = await preview(h, { rows: [rowOf('A', 'new')] });
        expect(Object.keys(rows[0]).slice(-2)).toEqual([
          'current_definition',
          'message',
        ]);
        expect(rows[0].action).toBe('update');
        expect(rows[0].glossary_id).toBe(5);
        expect(rows[0].current_definition).toBe('definition of A');
        // pinned as-is: the key exists with `undefined`, so JSON drops it.
        expect(rows[0].message).toBeUndefined();
        expect('message' in JSON.parse(JSON.stringify(rows[0]))).toBe(false);
      });

      it('cleans every field the way the import will store it', async () => {
        const h = harness();
        const { rows } = await preview(h, {
          rows: [
            rowOf('  Impact   area ', '  text ', {
              source: ' S ',
              source_url: '',
              reference_date: ' 2026-01-02 ',
              alternative_labels: ' IA ; ie | IA ;;',
            }),
          ],
        });
        expect(rows[0]).toMatchObject({
          term: 'Impact area',
          definition: 'text',
          source: 'S',
          source_url: null,
          reference_date: '2026-01-02',
          alternative_labels: ['IA', 'ie'],
        });
      });

      it('an unmapped label column is null, a mapped empty cell is []', async () => {
        const h = harness();
        const { rows } = await preview(h, {
          rows: [rowOf('A'), rowOf('B', 'd', { alternative_labels: '' })],
        });
        expect(rows[0].alternative_labels).toBeNull();
        expect(rows[1].alternative_labels).toEqual([]);
      });

      it('numbers rows from 1 and counts invalid rows too', async () => {
        const h = harness();
        const { rows } = await preview(h, {
          rows: [rowOf(''), rowOf('A'), rowOf('')],
        });
        expect(rows.map((r) => r.index)).toEqual([1, 2, 3]);
      });
    });

    describe('why a row is invalid, in the order it is checked', () => {
      it('an unreadable date: this exact message', async () => {
        const h = harness();
        const { rows } = await preview(h, {
          rows: [rowOf('A', 'd', { reference_date: '2026-1-5' })],
        });
        expect(rows[0].action).toBe(GlossaryBulkRowAction.INVALID);
        expect(rows[0].message).toBe(
          'The reference date "2026-1-5" is not a calendar day in YYYY-MM-DD format',
        );
      });

      it('an empty term: "The term is empty"', async () => {
        const h = harness();
        const { rows } = await preview(h, { rows: [rowOf('  ')] });
        expect(rows[0].message).toBe('The term is empty');
      });

      it('an empty definition: "The definition is empty"', async () => {
        const h = harness();
        const { rows } = await preview(h, { rows: [rowOf('A', '  ')] });
        expect(rows[0].message).toBe('The definition is empty');
      });

      it('the date is reported before the term, and the term before the definition', async () => {
        const h = harness();
        const { rows } = await preview(h, {
          rows: [
            rowOf('', '', { reference_date: 'x' }),
            rowOf('', ''),
            rowOf('A', ''),
          ],
        });
        expect(rows.map((r) => r.message)).toEqual([
          'The reference date "x" is not a calendar day in YYYY-MM-DD format',
          'The term is empty',
          'The definition is empty',
        ]);
      });

      it('a duplicate inside the file points at the first row, case-insensitively', async () => {
        const h = harness();
        const { rows } = await preview(h, {
          rows: [rowOf('Outcome'), rowOf('x'), rowOf(' OUTCOME ')],
        });
        expect(rows[2].action).toBe('invalid');
        expect(rows[2].message).toBe(
          'Duplicated in the file (already present on row 1)',
        );
      });

      it('an invalid row does not reserve its term for a later duplicate', async () => {
        // pinned as-is: row 1 returns before `seenInFile.set`.
        const h = harness();
        const { rows } = await preview(h, {
          rows: [rowOf('Outcome', ''), rowOf('Outcome')],
        });
        expect(rows.map((r) => r.action)).toEqual(['invalid', 'create']);
      });

      it('a term with two versions and no portfolio to tell them apart: this exact message', async () => {
        const h = harness();
        h.addRow(1, 'Outcome');
        h.addRow(2, 'Outcome');
        h.addLink(1, 2);
        h.addLink(2, 3);
        const { rows } = await preview(h, { rows: [rowOf('Outcome')] });
        expect(rows[0].action).toBe('invalid');
        expect(rows[0].message).toBe(
          '"Outcome" exists in 2 versions (records 1, 2). ' +
            'Map a portfolio column, or pick one for the whole batch, so the row updates the right version.',
        );
      });

      it('an unknown portfolio rejects the whole batch with its ids', async () => {
        const h = harness();
        const error = await preview(h, {
          rows: [rowOf('A', 'd', { portfolio_ids: [9] })],
          portfolio_ids: [8],
        }).catch((e) => e);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Unknown portfolio id(s): 8, 9');
      });
    });

    describe('conflict policy', () => {
      it('defaults to update', async () => {
        const h = harness();
        h.addRow(1, 'A');
        const { rows } = await preview(h, { rows: [rowOf('A')] });
        expect(rows[0].action).toBe('update');
      });

      it('skip: this message for an active term, with its id and current definition', async () => {
        const h = harness();
        h.addRow(1, 'A');
        const { rows, summary } = await preview(h, {
          rows: [rowOf('A', 'new')],
          on_conflict: 'skip',
        });
        expect(rows[0]).toMatchObject({
          action: 'skip',
          glossary_id: 1,
          current_definition: 'definition of A',
          message: 'The term already exists and the policy is to skip it',
        });
        expect(summary.skipped).toBe(1);
      });

      it('skip: this message for a deactivated term', async () => {
        const h = harness();
        h.addRow(1, 'A', {}, { is_active: false });
        const { rows } = await preview(h, {
          rows: [rowOf('A')],
          on_conflict: 'skip',
        });
        expect(rows[0].message).toBe(
          'The term exists but is deactivated, and the policy is to skip it',
        );
      });

      it('update on a deactivated term is a reactivate, with this message', async () => {
        const h = harness();
        h.addRow(1, 'A', {}, { is_active: false });
        const { rows, summary } = await preview(h, { rows: [rowOf('A')] });
        expect(rows[0].action).toBe('reactivate');
        expect(rows[0].message).toBe(
          'This term was deactivated. Importing it will publish it again.',
        );
        expect(summary.to_reactivate).toBe(1);
      });

      it('matches drafts and in-review terms as existing, so a file never duplicates them', async () => {
        const h = harness();
        h.addRow(1, 'A', { editorial_status: GlossaryEditorialStatus.DRAFT });
        const { rows } = await preview(h, { rows: [rowOf('A')] });
        expect(rows[0].action).toBe('update');
      });
    });

    describe('portfolios of a row', () => {
      it('uses the batch portfolios when the row brings none, in the order given', async () => {
        const h = harness();
        const { rows } = await preview(h, {
          rows: [rowOf('A')],
          portfolio_ids: [3, 2, 3],
        });
        expect(rows[0].portfolios).toEqual([
          { id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' },
          { id: 2, name: 'CGIAR portfolio 2022-2024', acronym: 'P22' },
        ]);
      });

      it('the portfolios of the row replace the batch ones, they do not add to them', async () => {
        const h = harness();
        const { rows } = await preview(h, {
          rows: [rowOf('A', 'd', { portfolio_ids: [2] })],
          portfolio_ids: [3],
        });
        expect(rows[0].portfolios.map((p) => p.id)).toEqual([2]);
      });

      it('an empty portfolio_ids on the row falls back to the batch', async () => {
        const h = harness();
        const { rows } = await preview(h, {
          rows: [rowOf('A', 'd', { portfolio_ids: [] })],
          portfolio_ids: [3],
        });
        expect(rows[0].portfolios.map((p) => p.id)).toEqual([3]);
      });
    });

    describe('import', () => {
      it('answers { summary, applied: true, rows } and opens one transaction', async () => {
        const h = harness();
        const result = await importing(h, { rows: [rowOf('A')] });
        expect(Object.keys(result)).toEqual(['summary', 'applied', 'rows']);
        expect(result.applied).toBe(true);
        expect(h.dataSource.transaction).toHaveBeenCalledTimes(1);
      });

      it('puts the id each term was stored under in glossary_id', async () => {
        const h = harness();
        const result = await importing(h, { rows: [rowOf('A'), rowOf('B')] });
        const ids = result.rows.map((r) => r.glossary_id);
        expect(ids.every((id) => Number.isInteger(id))).toBe(true);
        expect(new Set(ids).size).toBe(2);
        expect(h.rows.get(ids[0]).title).toBe('A');
      });

      it('creates a term with exactly these columns: no group, NO editorial status', async () => {
        // pinned as-is: like the split, a bulk-created term gets the database
        // default `approved`, so a file publishes its terms immediately.
        const h = harness();
        await importing(h, {
          rows: [
            rowOf('A', 'd', {
              source: 'S',
              source_url: 'U',
              reference_date: '2026-01-02',
              alternative_labels: 'x;y',
            }),
          ],
        });
        const plain = h.created.find((c) => c.entity === 'Glossary').plain;
        expect(plain).toEqual({
          title: 'A',
          definition: 'd',
          source: 'S',
          sourceUrl: 'U',
          referenceDate: '2026-01-02',
          alternative_labels: '["x","y"]',
          applicationName: null,
          show_in_dashboard: false,
        });
        expect('editorial_status' in plain).toBe(false);
        expect('group_id' in plain).toBe(false);
      });

      it('applies application_name and show_in_dashboard of the batch to a CREATED term', async () => {
        const h = harness();
        await importing(h, {
          rows: [rowOf('A')],
          application_name: 'PRMS',
          show_in_dashboard: true,
        });
        const plain = h.created.find((c) => c.entity === 'Glossary').plain;
        expect(plain.applicationName).toBe('PRMS');
        expect(plain.show_in_dashboard).toBe(true);
      });

      it('stamps created_by and is_active on a created term', async () => {
        const h = harness();
        await importing(h, { rows: [rowOf('A')] });
        expect(h.savedOf('Glossary')[0].value.auditableFields).toEqual({
          is_active: true,
          created_by: 7,
        });
      });

      it('on an UPDATE, application_name is ignored but show_in_dashboard is applied', async () => {
        // pinned as-is: updateFromBulkRow only looks at show_in_dashboard.
        const h = harness();
        h.addRow(1, 'A', { applicationName: 'MEL', show_in_dashboard: false });
        await importing(h, {
          rows: [rowOf('A', 'new')],
          application_name: 'PRMS',
          show_in_dashboard: true,
        });
        expect(h.rows.get(1).applicationName).toBe('MEL');
        expect(h.rows.get(1).show_in_dashboard).toBe(true);
      });

      it('on an UPDATE, show_in_dashboard is left alone when the batch does not mention it', async () => {
        const h = harness();
        h.addRow(1, 'A', { show_in_dashboard: true });
        await importing(h, { rows: [rowOf('A', 'new')] });
        expect(h.rows.get(1).show_in_dashboard).toBe(true);
      });

      it('on an UPDATE, rewrites the definition and the title with the casing of the file', async () => {
        const h = harness();
        h.addRow(1, 'Outcome');
        await importing(h, { rows: [rowOf('OUTCOME', 'new')] });
        expect(h.rows.get(1).title).toBe('OUTCOME');
        expect(h.rows.get(1).definition).toBe('new');
      });

      it('on an UPDATE, stamps updated_by and keeps the creator', async () => {
        const h = harness();
        h.addRow(1, 'A');
        await importing(h, { rows: [rowOf('A', 'new')] });
        expect(h.rows.get(1).auditableFields.updated_by).toBe(7);
        expect(h.rows.get(1).auditableFields.created_by).toBe(1);
      });

      it('an update of a DRAFT keeps it a draft but forces is_active to true', async () => {
        // pinned as-is: a file can switch an inactive draft back on, and the
        // editorial status is never part of an import.
        const h = harness();
        h.addRow(
          1,
          'A',
          { editorial_status: GlossaryEditorialStatus.DRAFT },
          { is_active: false },
        );
        const result = await importing(h, { rows: [rowOf('A', 'new')] });
        expect(result.rows[0].action).toBe('reactivate');
        expect(h.rows.get(1).editorial_status).toBe('draft');
        expect(h.rows.get(1).auditableFields.is_active).toBe(true);
      });

      it('an update keeps a deprecated term deprecated, with its replacement', async () => {
        const h = harness();
        h.addRow(1, 'A', {
          editorial_status: GlossaryEditorialStatus.DEPRECATED,
          replaced_by_id: 2 as any,
        });
        await importing(h, { rows: [rowOf('A', 'new')] });
        expect(h.rows.get(1).editorial_status).toBe('deprecated');
        expect(h.rows.get(1).replaced_by_id).toBe(2);
      });

      it('an update keeps the provenance when the file maps none, and overwrites it when it does', async () => {
        const h = harness();
        h.addRow(1, 'A', {
          source: 'Old',
          sourceUrl: 'https://old.org',
          referenceDate: '2020-01-01',
        });
        await importing(h, { rows: [rowOf('A', 'new')] });
        expect(h.rows.get(1).source).toBe('Old');
        await importing(h, { rows: [rowOf('A', 'new', { source: 'New' })] });
        expect(h.rows.get(1).source).toBe('New');
        expect(h.rows.get(1).sourceUrl).toBe('https://old.org');
        expect(h.rows.get(1).referenceDate).toBe('2020-01-01');
      });

      it('skipped rows write nothing', async () => {
        const h = harness();
        h.addRow(1, 'A');
        await importing(h, { rows: [rowOf('A', 'new')], on_conflict: 'skip' });
        expect(h.saved).toEqual([]);
        expect(h.rows.get(1).definition).toBe('definition of A');
      });

      it('syncs the portfolios only when the row ends up with some', async () => {
        const h = harness();
        h.addRow(1, 'A');
        const link = h.addLink(1, 2);
        await importing(h, { rows: [rowOf('A', 'new')] });
        expect(link.auditableFields.is_active).toBe(true);
        expect(h.log).not.toContain('save:GlossaryPortfolio');
        await importing(h, { rows: [rowOf('A', 'new')], portfolio_ids: [3] });
        expect(link.auditableFields.is_active).toBe(false);
        expect(
          h.links.some(
            (l) => l.portfolio_id === 3 && l.auditableFields.is_active,
          ),
        ).toBe(true);
      });

      it('lists only the first five invalid rows, as "row N (message)" joined by "; "', async () => {
        const h = harness();
        const error = await importing(h, {
          rows: Array.from({ length: 7 }, () => rowOf('')),
        }).catch((e) => e);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          '7 row(s) are invalid. Fix them before importing: ' +
            [1, 2, 3, 4, 5]
              .map((n) => `row ${n} (The term is empty)`)
              .join('; '),
        );
        expect(error.message).not.toContain('row 6');
      });

      it('one invalid row among valid ones writes nothing at all', async () => {
        const h = harness();
        await importing(h, {
          rows: [rowOf('A'), rowOf('B', ''), rowOf('C')],
        }).catch(() => undefined);
        expect(h.saved).toEqual([]);
        expect(h.created).toEqual([]);
      });

      it('counts create, update, reactivate and skip in the summary', async () => {
        const h = harness();
        h.addRow(1, 'Live');
        h.addRow(2, 'Hidden', {}, { is_active: false });
        h.addRow(3, 'Kept');
        const result = await importing(h, {
          rows: [rowOf('New'), rowOf('Live'), rowOf('Hidden')],
        });
        expect(result.summary).toEqual({
          total: 3,
          to_create: 1,
          to_update: 1,
          to_reactivate: 1,
          skipped: 0,
          invalid: 0,
        });
      });
    });

    describe('GlossaryBulkDto validation', () => {
      const rows = (n: number) =>
        Array.from({ length: n }, (_, i) => ({
          term: `t${i}`,
          definition: 'd',
        }));

      it('accepts 1 and 2000 rows', async () => {
        await expect(
          validate(GlossaryBulkDto, { rows: rows(1) }),
        ).resolves.toBeDefined();
        await expect(
          validate(GlossaryBulkDto, { rows: rows(2000) }),
        ).resolves.toBeDefined();
      });

      it('refuses no rows with "At least one row is required"', async () => {
        expect(await refusal(GlossaryBulkDto, { rows: [] })).toEqual([
          'At least one row is required',
        ]);
      });

      it('refuses 2001 rows with this message', async () => {
        expect(await refusal(GlossaryBulkDto, { rows: rows(2001) })).toEqual([
          'A maximum of 2000 rows can be processed at once',
        ]);
      });

      it('refuses a missing rows key', async () => {
        const messages = await refusal(GlossaryBulkDto, {});
        expect(messages).toContain('rows must be an array');
        expect(messages).toContain('At least one row is required');
      });

      it.each([['skip'], ['update']])(
        'accepts on_conflict %s',
        async (value) => {
          await expect(
            validate(GlossaryBulkDto, { rows: rows(1), on_conflict: value }),
          ).resolves.toBeDefined();
        },
      );

      it('refuses on_conflict "merge" with the list of values', async () => {
        expect(
          await refusal(GlossaryBulkDto, {
            rows: rows(1),
            on_conflict: 'merge',
          }),
        ).toEqual([
          'on_conflict must be one of the following values: skip, update',
        ]);
      });

      it('refuses a row whose term or definition is not a string, naming its position', async () => {
        const messages = await refusal(GlossaryBulkDto, {
          rows: [{ term: 5, definition: null }],
        });
        expect(messages).toEqual([
          'rows.0.term must be a string',
          'rows.0.definition must be a string',
        ]);
      });

      it('refuses an unknown key inside a row', async () => {
        expect(
          await refusal(GlossaryBulkDto, {
            rows: [{ term: 'a', definition: 'b', editorial_status: 'draft' }],
          }),
        ).toEqual(['rows.0.property editorial_status should not exist']);
      });

      it('refuses an unknown key at the top level', async () => {
        expect(
          await refusal(GlossaryBulkDto, {
            rows: rows(1),
            editorial_status: 'draft',
          }),
        ).toEqual(['property editorial_status should not exist']);
      });

      it('refuses a source longer than 500 and labels longer than 4000, on the row', async () => {
        expect(
          await refusal(GlossaryBulkDto, {
            rows: [{ term: 'a', definition: 'b', source: 'x'.repeat(501) }],
          }),
        ).toEqual([
          'rows.0.source must be shorter than or equal to 500 characters',
        ]);
        expect(
          await refusal(GlossaryBulkDto, {
            rows: [
              {
                term: 'a',
                definition: 'b',
                alternative_labels: 'x'.repeat(4001),
              },
            ],
          }),
        ).toEqual([
          'rows.0.alternative_labels must be shorter than or equal to 4000 characters',
        ]);
      });

      it('accepts any text as a row reference_date: the service judges it', async () => {
        await expect(
          validate(GlossaryBulkDto, {
            rows: [
              { term: 'a', definition: 'b', reference_date: 'not a date' },
            ],
          }),
        ).resolves.toBeDefined();
      });

      it('refuses show_in_dashboard that is not a boolean and application_name over 100', async () => {
        expect(
          await refusal(GlossaryBulkDto, {
            rows: rows(1),
            show_in_dashboard: 'yes',
          }),
        ).toEqual(['show_in_dashboard must be a boolean value']);
        expect(
          await refusal(GlossaryBulkDto, {
            rows: rows(1),
            application_name: 'x'.repeat(101),
          }),
        ).toEqual([
          'application_name must be shorter than or equal to 100 characters',
        ]);
      });

      it('turns the rows into GlossaryBulkRowDto instances', async () => {
        const dto: any = await validate(GlossaryBulkDto, { rows: rows(1) });
        expect(dto.rows[0].constructor.name).toBe('GlossaryBulkRowDto');
      });
    });
  });

  // ------------------------------------------------- reference date pattern

  describe('REFERENCE_DATE_PATTERN', () => {
    it.each([['2026-13-45'], ['0000-00-00'], ['9999-99-99'], ['2026-02-31']])(
      'accepts %s although it is not a calendar day',
      (value) => {
        // pinned as-is: the pattern only checks four digits, two, two.
        expect(REFERENCE_DATE_PATTERN.test(value)).toBe(true);
      },
    );

    it.each([
      ['2026-1-5'],
      ['26-01-05'],
      [' 2026-01-05'],
      ['2026-01-05 '],
      ['2026-01-05\n'],
      ['2026/01/05'],
      ['2026-01-05T00:00:00Z'],
      [''],
      ['٢٠٢٦-٠١-٠٥'],
    ])('refuses %p', (value) => {
      expect(REFERENCE_DATE_PATTERN.test(value)).toBe(false);
    });

    it('the create DTO accepts 2026-13-45', async () => {
      await expect(
        validate(CreateGlossaryTermDto, {
          term: 'A',
          definition: 'b',
          reference_date: '2026-13-45',
        }),
      ).resolves.toMatchObject({ reference_date: '2026-13-45' });
    });

    it('the update DTO accepts 2026-13-45, an empty string and null', async () => {
      for (const reference_date of ['2026-13-45', '', null]) {
        await expect(
          validate(UpdateGlossaryTermDto, { reference_date }),
        ).resolves.toBeDefined();
      }
    });

    it('the DTOs refuse 2026-1-5 with this message', async () => {
      expect(
        await refusal(CreateGlossaryTermDto, {
          term: 'A',
          definition: 'b',
          reference_date: '2026-1-5',
        }),
      ).toEqual([
        'The reference date must be a calendar day in YYYY-MM-DD format',
      ]);
    });

    it('a bulk row with 2026-13-45 is NOT invalid: it is planned as a create', async () => {
      // pinned as-is.
      const h = harness();
      const { rows } = await h.service.bulkPreview({
        rows: [{ term: 'A', definition: 'd', reference_date: '2026-13-45' }],
      } as any);
      expect(rows[0].action).toBe('create');
      expect(rows[0].reference_date).toBe('2026-13-45');
    });

    it('create stores 2026-13-45 as it comes and the panel gets it back cut to ten characters', async () => {
      const h = harness();
      const dto = await h.service.create(
        { term: 'A', definition: 'd', reference_date: '2026-13-45' },
        user,
      );
      expect(h.created[0].plain.referenceDate).toBe('2026-13-45');
      expect(dto.reference_date).toBe('2026-13-45');
    });
  });

  // ------------------------------------------------------- create DTO extras

  describe('CreateGlossaryTermDto', () => {
    const base = { term: 'A', definition: 'b' };

    it('refuses a missing term and a missing definition with their messages', async () => {
      expect(await refusal(CreateGlossaryTermDto, {})).toEqual(
        expect.arrayContaining([
          'The term is required',
          'The definition is required',
        ]),
      );
    });

    it('refuses a term over 500 characters', async () => {
      expect(
        await refusal(CreateGlossaryTermDto, {
          ...base,
          term: 'x'.repeat(501),
        }),
      ).toEqual(['term must be shorter than or equal to 500 characters']);
    });

    it('refuses an editorial_status outside the four values', async () => {
      expect(
        await refusal(CreateGlossaryTermDto, {
          ...base,
          editorial_status: 'published',
        }),
      ).toEqual([
        'editorial_status must be one of the following values: draft, in_review, approved, deprecated',
      ]);
    });

    it('accepts a draft', async () => {
      await expect(
        validate(CreateGlossaryTermDto, { ...base, editorial_status: 'draft' }),
      ).resolves.toBeDefined();
    });

    it('reads group_of "3" as the number 3 and refuses a word', async () => {
      const dto: any = await validate(CreateGlossaryTermDto, {
        ...base,
        group_of: '3',
      });
      expect(dto.group_of).toBe(3);
      expect(
        await refusal(CreateGlossaryTermDto, { ...base, group_of: 'x' }),
      ).toEqual(['group_of must be an integer number']);
    });

    it('refuses more than 30 alternative labels and a label over 200 characters', async () => {
      expect(
        await refusal(CreateGlossaryTermDto, {
          ...base,
          alternative_labels: Array.from({ length: 31 }, (_, i) => `l${i}`),
        }),
      ).toEqual(['alternative_labels must contain no more than 30 elements']);
      expect(
        await refusal(CreateGlossaryTermDto, {
          ...base,
          alternative_labels: ['x'.repeat(201)],
        }),
      ).toEqual([
        'each value in alternative_labels must be shorter than or equal to 200 characters',
      ]);
    });

    it('refuses portfolio_ids that are not integers', async () => {
      expect(
        await refusal(CreateGlossaryTermDto, { ...base, portfolio_ids: ['x'] }),
      ).toEqual(['each value in portfolio_ids must be an integer number']);
    });

    it('refuses the keys the panel never sends: id, group_id, is_active', async () => {
      expect(
        await refusal(CreateGlossaryTermDto, {
          ...base,
          id: 1,
          group_id: 2,
          is_active: true,
        }),
      ).toEqual([
        'property id should not exist',
        'property group_id should not exist',
        'property is_active should not exist',
      ]);
    });
  });
});
