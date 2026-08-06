import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GlossaryAdminService } from './glossary-admin.service';
import { GlossaryRepository } from './repositories/glossary.repository';
import { Glossary } from './entities/glossary.entity';
import { Portfolio } from '../portfolio/entities/portfolio.entity';
import { UserData } from '../../shared/interfaces/user-data';
import {
  GlossaryBulkConflictPolicy,
  GlossaryBulkRowAction,
} from './dto/glossary-admin.dto';

const userData: UserData = {
  userId: 7,
  email: 'y.zuniga@cgiar.org',
  permissions: '/api/',
};

const portfolio = (id: number, acronym: string): Partial<Portfolio> => ({
  id,
  name: `CGIAR portfolio ${acronym}`,
  acronym,
});

describe('GlossaryAdminService', () => {
  let service: GlossaryAdminService;

  /** Rows the fake `manager.find(Glossary, …)` returns. */
  let storedGlossary: Partial<Glossary>[];
  /** Portfolios the fake `manager.find(Portfolio, …)` resolves. */
  let storedPortfolios: Partial<Portfolio>[];
  /** Result of the case-insensitive title lookup used by create/update. */
  let titleLookupResult: Partial<Glossary> | null;

  let manager: any;
  let savedEntities: any[];

  const mockGlossaryRepository: any = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    storedGlossary = [];
    storedPortfolios = [
      portfolio(1, 'General'),
      portfolio(2, 'P22'),
      portfolio(3, 'P25'),
    ];
    titleLookupResult = null;
    savedEntities = [];

    manager = {
      find: jest.fn((entity: any, options: any) => {
        if (entity === Portfolio) {
          // Mimic `where: { id: In([...]) }` so the mock cannot return more
          // rows than were asked for.
          const wanted: number[] = options?.where?.id?._value ?? [];
          return Promise.resolve(
            storedPortfolios.filter((p) => wanted.includes(Number(p.id))),
          );
        }
        if (entity === Glossary) {
          return Promise.resolve(storedGlossary);
        }
        return Promise.resolve([]);
      }),
      findOne: jest.fn(() => Promise.resolve(null)),
      create: jest.fn((_entity: any, plain: any) => ({
        ...plain,
        auditableFields: {},
      })),
      save: jest.fn((_entity: any, value: any) => {
        savedEntities.push(value);
        return Promise.resolve(
          Array.isArray(value) ? value : { id: 99, ...value },
        );
      }),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(() => Promise.resolve(titleLookupResult)),
      })),
    };

    const mockDataSource: any = {
      manager,
      transaction: jest.fn((cb: any) => cb(manager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlossaryAdminService,
        { provide: GlossaryRepository, useValue: mockGlossaryRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<GlossaryAdminService>(GlossaryAdminService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  // ------------------------------------------------------------------ create

  describe('create', () => {
    it('collapses whitespace in the term before storing it', async () => {
      manager.findOne.mockResolvedValue({
        id: 99,
        title: 'Theory of Change',
        definition: 'A description',
        show_in_dashboard: false,
        applicationName: null,
        auditableFields: { is_active: true },
        glossary_portfolio_array: [],
      });

      const result = await service.create(
        { term: '  Theory   of  Change ', definition: ' A description ' },
        userData,
      );

      const created = manager.create.mock.calls.find(
        (c: any[]) => c[0] === Glossary,
      )[1];
      expect(created.title).toBe('Theory of Change');
      expect(created.definition).toBe('A description');
      expect(result.term).toBe('Theory of Change');
    });

    it('stamps created_by with the authenticated user', async () => {
      manager.findOne.mockResolvedValue({
        id: 99,
        title: 'Outcome',
        definition: 'A change',
        auditableFields: { is_active: true },
        glossary_portfolio_array: [],
      });

      await service.create(
        { term: 'Outcome', definition: 'A change' },
        userData,
      );

      const saved = savedEntities.find((e) => e && e.title === 'Outcome');
      expect(saved.auditableFields.created_by).toBe(userData.userId);
      expect(saved.auditableFields.is_active).toBe(true);
    });

    it('rejects a term that already exists, ignoring case', async () => {
      titleLookupResult = { id: 1, title: 'Outcome' };

      await expect(
        service.create({ term: 'outcome', definition: 'A change' }, userData),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects an empty term', async () => {
      await expect(
        service.create({ term: '   ', definition: 'A change' }, userData),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an empty definition', async () => {
      await expect(
        service.create({ term: 'Outcome', definition: '  ' }, userData),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects unknown portfolio ids instead of dropping them silently', async () => {
      await expect(
        service.create(
          { term: 'Outcome', definition: 'A change', portfolio_ids: [2, 404] },
          userData,
        ),
      ).rejects.toThrow(/Unknown portfolio id\(s\): 404/);
    });
  });

  // ------------------------------------------------------------------ update

  describe('update', () => {
    it('reports a missing term as a 404', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.update(42, { definition: 'x' }, userData),
      ).rejects.toThrow(/was not found/);
    });

    it('lets a term keep its own title when only the definition changes', async () => {
      const stored = {
        id: 5,
        title: 'Outcome',
        definition: 'old',
        auditableFields: { is_active: true },
        glossary_portfolio_array: [],
      };
      manager.findOne.mockResolvedValue(stored);
      titleLookupResult = { id: 5, title: 'Outcome' };

      await service.update(5, { term: 'Outcome', definition: 'new' }, userData);

      expect(stored.definition).toBe('new');
      expect(stored.auditableFields).toEqual(
        expect.objectContaining({ updated_by: userData.userId }),
      );
    });

    it('rejects renaming a term onto another existing term', async () => {
      manager.findOne.mockResolvedValue({
        id: 5,
        title: 'Outcome',
        definition: 'old',
        auditableFields: {},
      });
      titleLookupResult = { id: 9, title: 'Output' };

      await expect(
        service.update(5, { term: 'Output' }, userData),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // -------------------------------------------------------------- bulk plan

  describe('bulkPreview', () => {
    it('never persists anything', async () => {
      await service.bulkPreview({
        rows: [{ term: 'Outcome', definition: 'A change' }],
      });

      expect(manager.save).not.toHaveBeenCalled();
    });

    it('marks unknown terms as create and known ones as update', async () => {
      storedGlossary = [
        {
          id: 1,
          title: 'Impact Area',
          definition: 'old',
          auditableFields: { is_active: true } as any,
        },
      ];

      const result = await service.bulkPreview({
        rows: [
          { term: 'Impact Area', definition: 'new' },
          { term: 'Outcome', definition: 'A change' },
        ],
        portfolio_ids: [2],
      });

      expect(result.applied).toBe(false);
      expect(result.summary).toEqual({
        total: 2,
        to_create: 1,
        to_update: 1,
        to_reactivate: 0,
        skipped: 0,
        invalid: 0,
      });
      expect(result.rows[0].action).toBe(GlossaryBulkRowAction.UPDATE);
      expect(result.rows[0].glossary_id).toBe(1);
      expect(result.rows[0].current_definition).toBe('old');
      expect(result.rows[1].action).toBe(GlossaryBulkRowAction.CREATE);
      expect(result.rows[1].glossary_id).toBeNull();
    });

    it('matches existing terms ignoring case and surrounding whitespace', async () => {
      storedGlossary = [
        {
          id: 1,
          title: 'Impact Area',
          definition: 'old',
          auditableFields: { is_active: true } as any,
        },
      ];

      const result = await service.bulkPreview({
        rows: [{ term: '  impact   area ', definition: 'new' }],
      });

      expect(result.rows[0].action).toBe(GlossaryBulkRowAction.UPDATE);
      expect(result.rows[0].term).toBe('impact area');
    });

    it('skips existing terms when the policy says so', async () => {
      storedGlossary = [
        {
          id: 1,
          title: 'Impact Area',
          definition: 'old',
          auditableFields: { is_active: true } as any,
        },
      ];

      const result = await service.bulkPreview({
        rows: [{ term: 'Impact Area', definition: 'new' }],
        on_conflict: GlossaryBulkConflictPolicy.SKIP,
      });

      expect(result.rows[0].action).toBe(GlossaryBulkRowAction.SKIP);
      expect(result.summary.skipped).toBe(1);
    });

    it('reports a deactivated term as REACTIVATE instead of a plain update', async () => {
      storedGlossary = [
        {
          id: 1,
          title: 'Deprecated Term',
          definition: 'old',
          auditableFields: { is_active: false } as any,
        },
      ];

      const result = await service.bulkPreview({
        rows: [{ term: 'Deprecated Term', definition: 'new' }],
      });

      expect(result.rows[0].action).toBe(GlossaryBulkRowAction.REACTIVATE);
      expect(result.rows[0].message).toMatch(/deactivated/i);
      expect(result.summary.to_reactivate).toBe(1);
      expect(result.summary.to_update).toBe(0);
    });

    it('does not create a duplicate of a term that is merely deactivated', async () => {
      storedGlossary = [
        {
          id: 1,
          title: 'Deprecated Term',
          definition: 'old',
          auditableFields: { is_active: false } as any,
        },
      ];

      const result = await service.bulkPreview({
        rows: [{ term: 'deprecated term', definition: 'new' }],
      });

      expect(result.summary.to_create).toBe(0);
      expect(result.rows[0].glossary_id).toBe(1);
    });

    it('flags a term duplicated inside the same file, pointing at the first row', async () => {
      const result = await service.bulkPreview({
        rows: [
          { term: 'Outcome', definition: 'first' },
          { term: 'outcome', definition: 'second' },
        ],
      });

      expect(result.rows[1].action).toBe(GlossaryBulkRowAction.INVALID);
      expect(result.rows[1].message).toMatch(/row 1/);
      expect(result.summary.invalid).toBe(1);
    });

    it('flags empty terms and empty definitions', async () => {
      const result = await service.bulkPreview({
        rows: [
          { term: '  ', definition: 'no term' },
          { term: 'No definition', definition: '   ' },
        ],
      });

      expect(result.rows[0].message).toMatch(/term is empty/i);
      expect(result.rows[1].message).toMatch(/definition is empty/i);
      expect(result.summary.invalid).toBe(2);
    });

    it('applies the batch portfolios to every row that brings none', async () => {
      const result = await service.bulkPreview({
        rows: [
          { term: 'Outcome', definition: 'A change' },
          { term: 'Output', definition: 'A product', portfolio_ids: [3] },
        ],
        portfolio_ids: [2],
      });

      expect(result.rows[0].portfolios.map((p) => p.acronym)).toEqual(['P22']);
      expect(result.rows[1].portfolios.map((p) => p.acronym)).toEqual(['P25']);
    });

    it('rejects the whole batch when a portfolio id is unknown', async () => {
      await expect(
        service.bulkPreview({
          rows: [{ term: 'Outcome', definition: 'A change' }],
          portfolio_ids: [404],
        }),
      ).rejects.toThrow(/Unknown portfolio id\(s\): 404/);
    });

    it('numbers the rows starting at 1 so they match the file', async () => {
      const result = await service.bulkPreview({
        rows: [
          { term: 'A', definition: 'a' },
          { term: 'B', definition: 'b' },
        ],
      });

      expect(result.rows.map((r) => r.index)).toEqual([1, 2]);
    });
  });

  // ------------------------------------------------------------ bulk import

  describe('bulkImport', () => {
    it('refuses to write anything when at least one row is invalid', async () => {
      await expect(
        service.bulkImport(
          {
            rows: [
              { term: 'Outcome', definition: 'A change' },
              { term: '', definition: 'no term' },
            ],
          },
          userData,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(manager.save).not.toHaveBeenCalled();
    });

    it('creates the new terms and reports them as applied', async () => {
      const result = await service.bulkImport(
        { rows: [{ term: 'Outcome', definition: 'A change' }] },
        userData,
      );

      expect(result.applied).toBe(true);
      expect(result.summary.to_create).toBe(1);
      const saved = savedEntities.find((e) => e && e.title === 'Outcome');
      expect(saved.auditableFields.created_by).toBe(userData.userId);
    });

    it('leaves skipped rows untouched', async () => {
      storedGlossary = [
        {
          id: 1,
          title: 'Outcome',
          definition: 'old',
          auditableFields: { is_active: true } as any,
        },
      ];

      const result = await service.bulkImport(
        {
          rows: [{ term: 'Outcome', definition: 'new' }],
          on_conflict: GlossaryBulkConflictPolicy.SKIP,
        },
        userData,
      );

      expect(result.summary.skipped).toBe(1);
      expect(manager.save).not.toHaveBeenCalled();
    });
  });
});
