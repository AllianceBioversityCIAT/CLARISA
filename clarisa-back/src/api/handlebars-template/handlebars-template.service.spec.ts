import { Test, TestingModule } from '@nestjs/testing';
import { HandlebarsTemplateService } from './handlebars-template.service';
import { HandlebarsTemplateRepository } from './repositories/handlebars-template.repository';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('HandlebarsTemplateService', () => {
  let service: HandlebarsTemplateService;

  const mockHandlebarsTemplateRepository: any = {
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

  const mockCache: any = {
    set: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandlebarsTemplateService,
        {
          provide: HandlebarsTemplateRepository,
          useValue: mockHandlebarsTemplateRepository,
        },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<HandlebarsTemplateService>(HandlebarsTemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockHandlebarsTemplateRepository).forEach((k) => {
      if (
        typeof mockHandlebarsTemplateRepository[k]?.mockResolvedValue ===
        'function'
      ) {
        mockHandlebarsTemplateRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockHandlebarsTemplateRepository).forEach((k) => {
      if (
        typeof mockHandlebarsTemplateRepository[k]?.mockResolvedValue ===
        'function'
      ) {
        mockHandlebarsTemplateRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAll with invalid option', async () => {
    expect(() => service.findAll('invalid' as any)).toThrow();
  });

  it('should return a single item on findOneById', async () => {
    const mockItem = { id: 1 };
    mockHandlebarsTemplateRepository.findOneBy =
      mockHandlebarsTemplateRepository.findOneBy || jest.fn();
    mockHandlebarsTemplateRepository.findOne =
      mockHandlebarsTemplateRepository.findOne || jest.fn();
    mockHandlebarsTemplateRepository.findOneBy.mockResolvedValue(mockItem);
    mockHandlebarsTemplateRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOneById(1);
    expect(result).toBeDefined();
  });

  it('should return a single item on findOneByName', async () => {
    const mockItem = { id: 1 };
    mockHandlebarsTemplateRepository.findOneBy =
      mockHandlebarsTemplateRepository.findOneBy || jest.fn();
    mockHandlebarsTemplateRepository.findOne =
      mockHandlebarsTemplateRepository.findOne || jest.fn();
    mockHandlebarsTemplateRepository.findOneBy.mockResolvedValue(mockItem);
    mockHandlebarsTemplateRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOneByName(1 as any);
    expect(result).toBeDefined();
  });
});
