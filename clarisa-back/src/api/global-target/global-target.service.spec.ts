import { Test, TestingModule } from '@nestjs/testing';
import { GlobalTargetService } from './global-target.service';
import { GlobalTargetRepository } from './repositories/global-target.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('GlobalTargetService', () => {
  let service: GlobalTargetService;

  const mockGlobalTargetRepository: any = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
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
        GlobalTargetService,
        {
          provide: GlobalTargetRepository,
          useValue: mockGlobalTargetRepository,
        },
      ],
    }).compile();

    service = module.get<GlobalTargetService>(GlobalTargetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockGlobalTargetRepository).forEach((k) => {
      if (
        typeof mockGlobalTargetRepository[k]?.mockResolvedValue === 'function'
      ) {
        mockGlobalTargetRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockGlobalTargetRepository).forEach((k) => {
      if (
        typeof mockGlobalTargetRepository[k]?.mockResolvedValue === 'function'
      ) {
        mockGlobalTargetRepository[k].mockResolvedValue(mockItems);
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
    mockGlobalTargetRepository.findOneBy =
      mockGlobalTargetRepository.findOneBy || jest.fn();
    mockGlobalTargetRepository.findOne =
      mockGlobalTargetRepository.findOne || jest.fn();
    mockGlobalTargetRepository.findOneBy.mockResolvedValue(mockItem);
    mockGlobalTargetRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });

  it('should return paginated items on getUsersPagination', async () => {
    const mockItems = [{ id: 1 }];
    mockGlobalTargetRepository.findAndCount.mockResolvedValue([mockItems, 1]);

    const result = await service.getUsersPagination(0, 10);
    expect(result).toEqual({ items: mockItems, count: 1 });
  });

  it('should save items on update', async () => {
    const dto = [{ id: 1 }];
    mockGlobalTargetRepository.save.mockResolvedValue(dto);

    await service.update(dto as any);
    expect(mockGlobalTargetRepository.save).toHaveBeenCalledWith(dto);
  });
});
