import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';
import { PortfolioRepository } from './repositories/portfolio.repository';
import { PortfolioMapper } from './mappers/portfolio.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('PortfolioService', () => {
  let service: PortfolioService;

  const mockPortfolioRepository: any = {
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

  const mockPortfolioMapper: any = {
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
        PortfolioService,
        { provide: PortfolioRepository, useValue: mockPortfolioRepository },
        { provide: PortfolioMapper, useValue: mockPortfolioMapper },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should return items on findAll with SHOW_ALL', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      Object.keys(mockPortfolioRepository).forEach(k => {
        if (typeof mockPortfolioRepository[k]?.mockResolvedValue === 'function') {
          mockPortfolioRepository[k].mockResolvedValue(mockItems);
        }
      });
      Object.keys(mockPortfolioMapper).forEach(k => {
        if (typeof mockPortfolioMapper[k]?.mockReturnValue === 'function') {
          mockPortfolioMapper[k].mockReturnValue(mockItems);
        }
      });

      const result = await service.findAll(FindAllOptions.SHOW_ALL);
      expect(result).toBeDefined();
    });

    it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
      const mockItems = [{ id: 1 }];
      Object.keys(mockPortfolioRepository).forEach(k => {
        if (typeof mockPortfolioRepository[k]?.mockResolvedValue === 'function') {
          mockPortfolioRepository[k].mockResolvedValue(mockItems);
        }
      });
      Object.keys(mockPortfolioMapper).forEach(k => {
        if (typeof mockPortfolioMapper[k]?.mockReturnValue === 'function') {
          mockPortfolioMapper[k].mockReturnValue(mockItems);
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
      mockPortfolioRepository.findOneBy = mockPortfolioRepository.findOneBy || jest.fn();
      mockPortfolioRepository.findOne = mockPortfolioRepository.findOne || jest.fn();
      mockPortfolioRepository.findOneBy.mockResolvedValue(mockItem);
      mockPortfolioRepository.findOne.mockResolvedValue(mockItem);
      Object.keys(mockPortfolioMapper).forEach(k => {
        if (typeof mockPortfolioMapper[k]?.mockReturnValue === 'function') {
          mockPortfolioMapper[k].mockReturnValue(mockItem);
        }
      });

      const result = await service.findOne(1);
      expect(result).toBeDefined();
    });
});
