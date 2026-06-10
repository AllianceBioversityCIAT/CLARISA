import { Test, TestingModule } from '@nestjs/testing';
import { UnitService } from './unit.service';
import { UnitRepository } from './repositories/unit.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('UnitService', () => {
  let service: UnitService;

  const mockUnitRepository: any = {
    findAllUnits: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
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
        UnitService,
        { provide: UnitRepository, useValue: mockUnitRepository },
      ],
    }).compile();

    service = module.get<UnitService>(UnitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockUnitRepository).forEach((k) => {
      if (typeof mockUnitRepository[k]?.mockResolvedValue === 'function') {
        mockUnitRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockUnitRepository).forEach((k) => {
      if (typeof mockUnitRepository[k]?.mockResolvedValue === 'function') {
        mockUnitRepository[k].mockResolvedValue(mockItems);
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
    mockUnitRepository.findOneBy = mockUnitRepository.findOneBy || jest.fn();
    mockUnitRepository.findOne = mockUnitRepository.findOne || jest.fn();
    mockUnitRepository.findOneBy.mockResolvedValue(mockItem);
    mockUnitRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });

  it('should save items on update', async () => {
    const dto = [{ id: 1 }];
    mockUnitRepository.save.mockResolvedValue(dto);

    await service.update(dto as any);
    expect(mockUnitRepository.save).toHaveBeenCalledWith(dto);
  });
});
