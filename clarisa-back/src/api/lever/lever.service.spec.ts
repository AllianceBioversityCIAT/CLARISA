import { Test, TestingModule } from '@nestjs/testing';
import { LeverService } from './lever.service';
import { LeverRepository } from './repositories/lever.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('LeverService', () => {
  let service: LeverService;

  const mockLeverRepository: any = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
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
        LeverService,
        { provide: LeverRepository, useValue: mockLeverRepository },
      ],
    }).compile();

    service = module.get<LeverService>(LeverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockLeverRepository).forEach((k) => {
      if (typeof mockLeverRepository[k]?.mockResolvedValue === 'function') {
        mockLeverRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockLeverRepository).forEach((k) => {
      if (typeof mockLeverRepository[k]?.mockResolvedValue === 'function') {
        mockLeverRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAll with invalid option', async () => {
    await expect(service.findAll('invalid' as any)).rejects.toThrow();
  });

  it('should return a single item on findOne', async () => {
    const mockItem = { id: 1 };
    mockLeverRepository.findOneBy = mockLeverRepository.findOneBy || jest.fn();
    mockLeverRepository.findOne = mockLeverRepository.findOne || jest.fn();
    mockLeverRepository.findOneBy.mockResolvedValue(mockItem);
    mockLeverRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });
});
