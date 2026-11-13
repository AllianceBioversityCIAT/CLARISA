import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GlossaryService } from './glossary.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { GLOSSARY_STORAGE } from './glossary-store';
import { InMemoryGlossaryStore } from './testing/in-memory-glossary-store';
import { Glossary, GlossaryEditorialStatus } from './entities/glossary.entity';
import { GlossaryPortfolio } from './entities/glossary-portfolio.entity';
import { Portfolio } from '../portfolio/entities/portfolio.entity';

const term = (
  id: number,
  title: string,
  active = true,
  status = GlossaryEditorialStatus.APPROVED,
): Glossary => {
  const g = new Glossary();
  g.id = id;
  g.title = title;
  g.definition = `definition of ${title}`;
  g.editorial_status = status;
  g.show_in_dashboard = false;
  const portfolio = Object.assign(new Portfolio(), {
    id: 3,
    name: 'CGIAR portfolio 2025-2030',
    acronym: 'P25',
  });
  g.glossary_portfolio_array = [
    Object.assign(new GlossaryPortfolio(), {
      glossary_id: id,
      portfolio_id: 3,
      portfolio_object: portfolio,
      auditableFields: { is_active: true },
    }),
  ];
  g.auditableFields = { is_active: active } as Glossary['auditableFields'];
  return g;
};

describe('GlossaryService', () => {
  let service: GlossaryService;
  let store: InMemoryGlossaryStore;

  beforeEach(async () => {
    store = new InMemoryGlossaryStore([
      term(1, 'Outcome'),
      term(2, 'Impact', false),
      term(3, 'Draft', true, GlossaryEditorialStatus.DRAFT),
    ]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlossaryService,
        { provide: GLOSSARY_STORAGE, useValue: store },
      ],
    }).compile();

    service = module.get<GlossaryService>(GlossaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result.map((g) => g.id)).toEqual([2, 1]);
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result.map((g) => g.id)).toEqual([1]);
  });

  it('never publishes a draft or a term under review (show=all)', async () => {
    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result.some((g) => g.id === 3)).toBe(false);
  });

  it('never publishes a draft or a term under review (show=active)', async () => {
    const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result.some((g) => g.id === 3)).toBe(false);
  });

  it('never publishes a draft or a term under review (show=inactive)', async () => {
    store.put(term(4, 'Review', false, GlossaryEditorialStatus.IN_REVIEW));
    const result = await service.findAll(FindAllOptions.SHOW_ONLY_INACTIVE);
    expect(result.map((g) => g.id)).toEqual([2]);
  });

  it('does not serve a draft by id either', async () => {
    await expect(service.findOne(3)).resolves.toBeNull();
  });

  it('should throw on findAll with invalid option', async () => {
    expect(() => service.findAll('invalid' as FindAllOptions)).toThrow(
      BadRequestException,
    );
  });

  it('should return a single item on findOne', async () => {
    await expect(service.findOne(1)).resolves.toMatchObject({ id: 1 });
  });

  it('should load the portfolio relation on findOne', async () => {
    expect((await service.findOne(1)).portfolios).toEqual([
      { id: 3, name: 'CGIAR portfolio 2025-2030', acronym: 'P25' },
    ]);
  });

  it('should load the portfolio relation on findAll', async () => {
    const [first] = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(first.portfolios).toHaveLength(1);
  });

  it('should save items on update', async () => {
    const payload = [{ id: 1, title: 'Outcome (edited)' }];
    await expect(service.update(payload as never)).resolves.toBe(payload);
    expect((await store.byId(1)).title).toBe('Outcome (edited)');
  });

  it('should return paginated items on getRolesPagination', async () => {
    const page = await service.getRolesPagination(1, 1);
    expect(page.count).toBe(3);
    expect(page.items.map((g) => g.id)).toEqual([2]);
  });
});
