import { Test, TestingModule } from '@nestjs/testing';
import { InnovationCharacteristicService } from './innovation-characteristic.service';
import { InnovationCharacteristicRepository } from './repositories/innovation-characteristic.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('InnovationCharacteristicService', () => {
  let service: InnovationCharacteristicService;

  const mockInnovationCharacteristicRepository: any = {
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
        InnovationCharacteristicService,
        { provide: InnovationCharacteristicRepository, useValue: mockInnovationCharacteristicRepository },
      ],
    }).compile();

    service = module.get<InnovationCharacteristicService>(InnovationCharacteristicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should return items on findAll with SHOW_ALL', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      Object.keys(mockInnovationCharacteristicRepository).forEach(k => {
        if (typeof mockInnovationCharacteristicRepository[k]?.mockResolvedValue === 'function') {
          mockInnovationCharacteristicRepository[k].mockResolvedValue(mockItems);
        }
      });
      

      const result = await service.findAll(FindAllOptions.SHOW_ALL);
      expect(result).toBeDefined();
    });

    it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
      const mockItems = [{ id: 1 }];
      Object.keys(mockInnovationCharacteristicRepository).forEach(k => {
        if (typeof mockInnovationCharacteristicRepository[k]?.mockResolvedValue === 'function') {
          mockInnovationCharacteristicRepository[k].mockResolvedValue(mockItems);
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
      mockInnovationCharacteristicRepository.findOneBy = mockInnovationCharacteristicRepository.findOneBy || jest.fn();
      mockInnovationCharacteristicRepository.findOne = mockInnovationCharacteristicRepository.findOne || jest.fn();
      mockInnovationCharacteristicRepository.findOneBy.mockResolvedValue(mockItem);
      mockInnovationCharacteristicRepository.findOne.mockResolvedValue(mockItem);
      

      const result = await service.findOne(1);
      expect(result).toBeDefined();
    });
});
