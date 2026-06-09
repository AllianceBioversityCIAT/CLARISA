import { Test, TestingModule } from '@nestjs/testing';
import { GlossaryService } from './glossary.service';
import { GlossaryRepository } from './repositories/glossary.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('GlossaryService', () => {
  let service: GlossaryService;

  const mockGlossaryRepository: any = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getRawOne: jest.fn().mockResolvedValue({}),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlossaryService,
        { provide: GlossaryRepository, useValue: mockGlossaryRepository },
      ],
    }).compile();

    service = module.get<GlossaryService>(GlossaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockGlossaryRepository).forEach((k) => {
      if (typeof mockGlossaryRepository[k]?.mockResolvedValue === 'function') {
        mockGlossaryRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockGlossaryRepository).forEach((k) => {
      if (typeof mockGlossaryRepository[k]?.mockResolvedValue === 'function') {
        mockGlossaryRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAll with invalid option', async () => {
    expect(() => service.findAll('invalid' as any)).toThrow();
  });

  it('should return a single item on findOne', async () => {
    const mockItem = { id: 1 };
    mockGlossaryRepository.findOneBy =
      mockGlossaryRepository.findOneBy || jest.fn();
    mockGlossaryRepository.findOne =
      mockGlossaryRepository.findOne || jest.fn();
    mockGlossaryRepository.findOneBy.mockResolvedValue(mockItem);
    mockGlossaryRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });

  it('should save items on update', async () => {
    const dto = [{ id: 1 }];
    mockGlossaryRepository.save.mockResolvedValue(dto);

    await service.update(dto as any);
    expect(mockGlossaryRepository.save).toHaveBeenCalledWith(dto);
  });

  it('should return paginated items on getRolesPagination', async () => {
    const mockItems = [{ id: 1 }];
    mockGlossaryRepository.findAndCount.mockResolvedValue([mockItems, 1]);

    const result = await service.getRolesPagination(0, 10);
    expect(result).toEqual({ items: mockItems, count: 1 });
  });
});
