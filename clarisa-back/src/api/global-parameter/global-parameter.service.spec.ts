import { Test, TestingModule } from '@nestjs/testing';
import { GlobalParameterService } from './global-parameter.service';
import { GlobalParameterRepository } from './repositories/global-parameter.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('GlobalParameterService', () => {
  let service: GlobalParameterService;

  const mockGlobalParameterRepository: any = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
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
        GlobalParameterService,
        {
          provide: GlobalParameterRepository,
          useValue: mockGlobalParameterRepository,
        },
      ],
    }).compile();

    service = module.get<GlobalParameterService>(GlobalParameterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockGlobalParameterRepository).forEach((k) => {
      if (
        typeof mockGlobalParameterRepository[k]?.mockResolvedValue ===
        'function'
      ) {
        mockGlobalParameterRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockGlobalParameterRepository).forEach((k) => {
      if (
        typeof mockGlobalParameterRepository[k]?.mockResolvedValue ===
        'function'
      ) {
        mockGlobalParameterRepository[k].mockResolvedValue(mockItems);
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
    mockGlobalParameterRepository.findOneBy =
      mockGlobalParameterRepository.findOneBy || jest.fn();
    mockGlobalParameterRepository.findOne =
      mockGlobalParameterRepository.findOne || jest.fn();
    mockGlobalParameterRepository.findOneBy.mockResolvedValue(mockItem);
    mockGlobalParameterRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });
});
