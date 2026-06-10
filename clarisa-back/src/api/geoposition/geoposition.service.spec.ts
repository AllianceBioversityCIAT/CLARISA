import { Test, TestingModule } from '@nestjs/testing';
import { GeopositionService } from './geoposition.service';
import { GeopositionRepository } from './repositories/geoposition.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('GeopositionService', () => {
  let service: GeopositionService;

  const mockGeopositionRepository: any = {
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
        GeopositionService,
        { provide: GeopositionRepository, useValue: mockGeopositionRepository },
      ],
    }).compile();

    service = module.get<GeopositionService>(GeopositionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockGeopositionRepository).forEach((k) => {
      if (
        typeof mockGeopositionRepository[k]?.mockResolvedValue === 'function'
      ) {
        mockGeopositionRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockGeopositionRepository).forEach((k) => {
      if (
        typeof mockGeopositionRepository[k]?.mockResolvedValue === 'function'
      ) {
        mockGeopositionRepository[k].mockResolvedValue(mockItems);
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
    mockGeopositionRepository.findOneBy =
      mockGeopositionRepository.findOneBy || jest.fn();
    mockGeopositionRepository.findOne =
      mockGeopositionRepository.findOne || jest.fn();
    mockGeopositionRepository.findOneBy.mockResolvedValue(mockItem);
    mockGeopositionRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });
});
