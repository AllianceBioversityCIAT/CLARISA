import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GlossaryAdminService } from './glossary-admin.service';
import { GlossaryRepository } from './repositories/glossary.repository';
import { Glossary } from './entities/glossary.entity';
import { Portfolio } from '../portfolio/entities/portfolio.entity';
import { GlossaryPortfolio } from './entities/glossary-portfolio.entity';
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
  /** Rows the fake `manager.find(GlossaryPortfolio, …)` returns. */
  let storedGlossaryPortfolios: any[];

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
    storedGlossaryPortfolios = [];
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
        if (entity === GlossaryPortfolio) {
          const glossaryId = Number(options?.where?.glossary_id);
          return Promise.resolve(
            storedGlossaryPortfolios.filter(
              (gp) => Number(gp.glossary_id) === glossaryId,
            ),
          );
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

    it('keeps the portfolios of a term when the upload maps no portfolio column', async () => {
      // The regression this covers: `syncPortfolios` deactivates every
      // association absent from the list it receives, and this path used to
      // call it unconditionally. An upload meant to fix a definition, with no
      // portfolio column mapped and no batch portfolio chosen, therefore
      // stripped every term it touched out of the public page's filter.
      const stored = {
        id: 1,
        title: 'Outcome',
        definition: 'old',
        auditableFields: { is_active: true } as any,
      };
      storedGlossary = [stored];
      manager.findOne.mockResolvedValue(stored);
      storedGlossaryPortfolios = [
        {
          glossary_id: 1,
          portfolio_id: 2,
          auditableFields: { is_active: true },
        },
      ];

      await service.bulkImport(
        {
          rows: [{ term: 'Outcome', definition: 'new' }],
          on_conflict: GlossaryBulkConflictPolicy.UPDATE,
        },
        userData,
      );

      expect(storedGlossaryPortfolios[0].auditableFields.is_active).toBe(true);
      expect(
        savedEntities.some(
          (e) =>
            e && e.portfolio_id === 2 && e.auditableFields?.is_active === false,
        ),
      ).toBe(false);
    });

    it('still syncs portfolios when the upload does ask for them', async () => {
      const stored = {
        id: 1,
        title: 'Outcome',
        definition: 'old',
        auditableFields: { is_active: true } as any,
      };
      storedGlossary = [stored];
      manager.findOne.mockResolvedValue(stored);
      storedGlossaryPortfolios = [
        {
          glossary_id: 1,
          portfolio_id: 2,
          auditableFields: { is_active: true },
        },
      ];

      await service.bulkImport(
        {
          rows: [{ term: 'Outcome', definition: 'new' }],
          portfolio_ids: [3],
          on_conflict: GlossaryBulkConflictPolicy.UPDATE,
        },
        userData,
      );

      // Asking for portfolio 3 does mean portfolio 2 is no longer wanted.
      expect(storedGlossaryPortfolios[0].auditableFields.is_active).toBe(false);
      expect(
        savedEntities
          .flat()
          .some((e: any) => e && Number(e.portfolio_id) === 3),
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------- provenance

  describe('source and reference date', () => {
    it('stores the provenance sent on create', async () => {
      manager.findOne.mockResolvedValue({
        id: 99,
        title: 'Impact Area',
        auditableFields: { is_active: true },
      });

      await service.create(
        {
          term: 'Impact Area',
          definition: 'A definition',
          source: '  CGIAR 2025-2030 Portfolio Narrative  ',
          source_url: 'https://www.cgiar.org/',
          reference_date: '2025-01-15',
        },
        userData,
      );

      const created = savedEntities.find((e) => e && e.title === 'Impact Area');
      expect(created.source).toBe('CGIAR 2025-2030 Portfolio Narrative');
      expect(created.sourceUrl).toBe('https://www.cgiar.org/');
      expect(created.referenceDate).toBe('2025-01-15');
    });

    it('stores an empty source as null, never as an empty string', async () => {
      // An empty string would render a bare "Source:" line with nothing after
      // it on the public page.
      manager.findOne.mockResolvedValue({
        id: 99,
        title: 'Outcome',
        auditableFields: { is_active: true },
      });

      await service.create(
        {
          term: 'Outcome',
          definition: 'A definition',
          source: '   ',
          reference_date: '',
        },
        userData,
      );

      const created = savedEntities.find((e) => e && e.title === 'Outcome');
      expect(created.source).toBeNull();
      expect(created.referenceDate).toBeNull();
    });

    it('clears a stored source when the update sends it empty', async () => {
      const stored = {
        id: 1,
        title: 'Outcome',
        definition: 'A definition',
        source: 'Wrong source',
        sourceUrl: 'https://example.org/',
        referenceDate: '2020-01-01',
        auditableFields: { is_active: true } as any,
      };
      manager.findOne.mockResolvedValue(stored);

      await service.update(1, { source: '', reference_date: '' }, userData);

      expect(stored.source).toBeNull();
      expect(stored.referenceDate).toBeNull();
      // Not mentioned by the caller, so left exactly as it was.
      expect(stored.sourceUrl).toBe('https://example.org/');
    });

    it('leaves the provenance untouched when the update does not mention it', async () => {
      const stored = {
        id: 1,
        title: 'Outcome',
        definition: 'old',
        source: 'CGIAR 2025-2030 Portfolio Narrative',
        referenceDate: '2025-01-15',
        auditableFields: { is_active: true } as any,
      };
      manager.findOne.mockResolvedValue(stored);

      await service.update(1, { definition: 'new' }, userData);

      expect(stored.source).toBe('CGIAR 2025-2030 Portfolio Narrative');
      expect(stored.referenceDate).toBe('2025-01-15');
    });

    it('keeps the stored source when a bulk upload maps no source column', async () => {
      // Same trap as the portfolios above: an import that says nothing about
      // the source must not strip the attribution of every term it touches.
      const stored = {
        id: 1,
        title: 'Outcome',
        definition: 'old',
        source: 'CGIAR 2025-2030 Portfolio Narrative',
        sourceUrl: 'https://www.cgiar.org/',
        referenceDate: '2025-01-15' as any,
        auditableFields: { is_active: true } as any,
      };
      storedGlossary = [stored];
      manager.findOne.mockResolvedValue(stored);

      await service.bulkImport(
        {
          rows: [{ term: 'Outcome', definition: 'new' }],
          on_conflict: GlossaryBulkConflictPolicy.UPDATE,
        },
        userData,
      );

      expect(stored.definition).toBe('new');
      expect(stored.source).toBe('CGIAR 2025-2030 Portfolio Narrative');
      expect(stored.sourceUrl).toBe('https://www.cgiar.org/');
      expect(stored.referenceDate).toBe('2025-01-15');
    });

    it('overwrites the source when the bulk upload does bring one', async () => {
      const stored = {
        id: 1,
        title: 'Outcome',
        definition: 'old',
        source: 'Old source',
        referenceDate: null as any,
        auditableFields: { is_active: true } as any,
      };
      storedGlossary = [stored];
      manager.findOne.mockResolvedValue(stored);

      await service.bulkImport(
        {
          rows: [
            {
              term: 'Outcome',
              definition: 'new',
              source: 'New source',
              reference_date: '2026-09-07',
            },
          ],
          on_conflict: GlossaryBulkConflictPolicy.UPDATE,
        },
        userData,
      );

      expect(stored.source).toBe('New source');
      expect(stored.referenceDate).toBe('2026-09-07');
    });

    it('flags only the row whose reference date is unreadable, not the file', async () => {
      // A single bad cell in a 2000-row file must not fail the whole payload.
      const result = await service.bulkPreview({
        rows: [
          {
            term: 'Good',
            definition: 'A definition',
            reference_date: '2026-09-07',
          },
          {
            term: 'Bad',
            definition: 'A definition',
            reference_date: 'Sept 2026',
          },
        ],
      });

      expect(result.rows[0].action).not.toBe(GlossaryBulkRowAction.INVALID);
      expect(result.rows[1].action).toBe(GlossaryBulkRowAction.INVALID);
      expect(result.rows[1].message).toContain('Sept 2026');
      expect(result.applied).toBe(false);
    });
  });
});
