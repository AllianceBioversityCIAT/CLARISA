import { Test, TestingModule } from '@nestjs/testing';
import { FundingSourceService } from './funding-source.service';
import { FundingSourceRepository } from './repositories/funding-source.repository';
import { FundingSourceMapper } from './mappers/funding-source.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('FundingSourceService', () => {
  let service: FundingSourceService;

  const mockFundingSourceRepository: any = {
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

  const mockFundingSourceMapper: any = {
    classListToDtoList: jest.fn().mockImplementation((x) => x || []),
    classToDto: jest.fn().mockImplementation((x) => x || {}),
    classToDtoV1: jest.fn().mockImplementation((x) => x || {}),
    classToDtoV2: jest.fn().mockImplementation((x) => x || {}),
    classListToDtoV1List: jest.fn().mockImplementation((x) => x || []),
    classListToDtoV2List: jest.fn().mockImplementation((x) => x || []),
    entityTypeListToDtoV1List: jest.fn().mockImplementation((x) => x || []),
    entityTypeListToDtoV2List: jest.fn().mockImplementation((x) => x || []),
    entityTypeToDtoV1: jest.fn().mockImplementation((x) => x || []),
    entityTypeToDtoV2: jest.fn().mockImplementation((x) => x || []),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundingSourceService,
        { provide: FundingSourceRepository, useValue: mockFundingSourceRepository },
        { provide: FundingSourceMapper, useValue: mockFundingSourceMapper },
      ],
    }).compile();

    service = module.get<FundingSourceService>(FundingSourceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should return items on findAll with SHOW_ALL', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      Object.keys(mockFundingSourceRepository).forEach(k => {
        if (typeof mockFundingSourceRepository[k]?.mockResolvedValue === 'function') {
          mockFundingSourceRepository[k].mockResolvedValue(mockItems);
        }
      });
      Object.keys(mockFundingSourceMapper).forEach(k => {
        if (typeof mockFundingSourceMapper[k]?.mockReturnValue === 'function') {
          mockFundingSourceMapper[k].mockReturnValue(mockItems);
        }
      });

      const result = await service.findAll(FindAllOptions.SHOW_ALL);
      expect(result).toBeDefined();
    });

    it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
      const mockItems = [{ id: 1 }];
      Object.keys(mockFundingSourceRepository).forEach(k => {
        if (typeof mockFundingSourceRepository[k]?.mockResolvedValue === 'function') {
          mockFundingSourceRepository[k].mockResolvedValue(mockItems);
        }
      });
      Object.keys(mockFundingSourceMapper).forEach(k => {
        if (typeof mockFundingSourceMapper[k]?.mockReturnValue === 'function') {
          mockFundingSourceMapper[k].mockReturnValue(mockItems);
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
      mockFundingSourceRepository.findOneBy = mockFundingSourceRepository.findOneBy || jest.fn();
      mockFundingSourceRepository.findOne = mockFundingSourceRepository.findOne || jest.fn();
      mockFundingSourceRepository.findOneBy.mockResolvedValue(mockItem);
      mockFundingSourceRepository.findOne.mockResolvedValue(mockItem);
      Object.keys(mockFundingSourceMapper).forEach(k => {
        if (typeof mockFundingSourceMapper[k]?.mockReturnValue === 'function') {
          mockFundingSourceMapper[k].mockReturnValue(mockItem);
        }
      });

      const result = await service.findOne(1);
      expect(result).toBeDefined();
    });
});
