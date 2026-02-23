import { Test, TestingModule } from '@nestjs/testing';
import { GeographicScopeService } from './geographic-scope.service';
import { GeographicScopeRepository } from './repositories/geographic-scope.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('GeographicScopeService', () => {
  let service: GeographicScopeService;

  const mockGeographicScopeRepository: any = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
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
        GeographicScopeService,
        { provide: GeographicScopeRepository, useValue: mockGeographicScopeRepository },
      ],
    }).compile();

    service = module.get<GeographicScopeService>(GeographicScopeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should return items on findAll with SHOW_ALL', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      Object.keys(mockGeographicScopeRepository).forEach(k => {
        if (typeof mockGeographicScopeRepository[k]?.mockResolvedValue === 'function') {
          mockGeographicScopeRepository[k].mockResolvedValue(mockItems);
        }
      });
      

      const result = await service.findAll(FindAllOptions.SHOW_ALL);
      expect(result).toBeDefined();
    });

    it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
      const mockItems = [{ id: 1 }];
      Object.keys(mockGeographicScopeRepository).forEach(k => {
        if (typeof mockGeographicScopeRepository[k]?.mockResolvedValue === 'function') {
          mockGeographicScopeRepository[k].mockResolvedValue(mockItems);
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
      mockGeographicScopeRepository.findOneBy = mockGeographicScopeRepository.findOneBy || jest.fn();
      mockGeographicScopeRepository.findOne = mockGeographicScopeRepository.findOne || jest.fn();
      mockGeographicScopeRepository.findOneBy.mockResolvedValue(mockItem);
      mockGeographicScopeRepository.findOne.mockResolvedValue(mockItem);
      

      const result = await service.findOne(1);
      expect(result).toBeDefined();
    });

    it('should save items on update', async () => {
      const dto = [{ id: 1 }];
      mockGeographicScopeRepository.save.mockResolvedValue(dto);

      const result = await service.update(dto as any);
      expect(mockGeographicScopeRepository.save).toHaveBeenCalledWith(dto);
    });
});
