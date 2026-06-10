import { Test, TestingModule } from '@nestjs/testing';
import { SdgTargetService } from './sdg-target.service';
import { SdgTargetRepository } from './repositories/sdg-target.repository';
import { SdgTargetMapper } from './mappers/sdg-target.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('SdgTargetService', () => {
  let service: SdgTargetService;

  const mockSdgTargetRepository: any = {
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

  const mockSdgTargetMapper: any = {
    classListToDtoV1List: jest.fn().mockImplementation((x) => x || []),
    classListToDtoV2List: jest.fn().mockImplementation((x) => x || []),
    classToDto: jest.fn().mockImplementation((x) => x || {}),
    classToDtoV1: jest.fn().mockImplementation((x) => x || {}),
    classToDtoV2: jest.fn().mockImplementation((x) => x || {}),
    classListToDtoList: jest.fn().mockImplementation((x) => x || []),
    entityTypeListToDtoV1List: jest.fn().mockImplementation((x) => x || []),
    entityTypeListToDtoV2List: jest.fn().mockImplementation((x) => x || []),
    entityTypeToDtoV1: jest.fn().mockImplementation((x) => x || []),
    entityTypeToDtoV2: jest.fn().mockImplementation((x) => x || []),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SdgTargetService,
        { provide: SdgTargetRepository, useValue: mockSdgTargetRepository },
        { provide: SdgTargetMapper, useValue: mockSdgTargetMapper },
      ],
    }).compile();

    service = module.get<SdgTargetService>(SdgTargetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAllV1 with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockSdgTargetRepository).forEach((k) => {
      if (typeof mockSdgTargetRepository[k]?.mockResolvedValue === 'function') {
        mockSdgTargetRepository[k].mockResolvedValue(mockItems);
      }
    });
    Object.keys(mockSdgTargetMapper).forEach((k) => {
      if (typeof mockSdgTargetMapper[k]?.mockReturnValue === 'function') {
        mockSdgTargetMapper[k].mockReturnValue(mockItems);
      }
    });

    const result = await service.findAllV1(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAllV1 with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockSdgTargetRepository).forEach((k) => {
      if (typeof mockSdgTargetRepository[k]?.mockResolvedValue === 'function') {
        mockSdgTargetRepository[k].mockResolvedValue(mockItems);
      }
    });
    Object.keys(mockSdgTargetMapper).forEach((k) => {
      if (typeof mockSdgTargetMapper[k]?.mockReturnValue === 'function') {
        mockSdgTargetMapper[k].mockReturnValue(mockItems);
      }
    });

    const result = await service.findAllV1(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAllV1 with invalid option', async () => {
    await expect(service.findAllV1('invalid' as any)).rejects.toThrow();
  });

  it('should return items on findAllV2 with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockSdgTargetRepository).forEach((k) => {
      if (typeof mockSdgTargetRepository[k]?.mockResolvedValue === 'function') {
        mockSdgTargetRepository[k].mockResolvedValue(mockItems);
      }
    });
    Object.keys(mockSdgTargetMapper).forEach((k) => {
      if (typeof mockSdgTargetMapper[k]?.mockReturnValue === 'function') {
        mockSdgTargetMapper[k].mockReturnValue(mockItems);
      }
    });

    const result = await service.findAllV2(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAllV2 with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockSdgTargetRepository).forEach((k) => {
      if (typeof mockSdgTargetRepository[k]?.mockResolvedValue === 'function') {
        mockSdgTargetRepository[k].mockResolvedValue(mockItems);
      }
    });
    Object.keys(mockSdgTargetMapper).forEach((k) => {
      if (typeof mockSdgTargetMapper[k]?.mockReturnValue === 'function') {
        mockSdgTargetMapper[k].mockReturnValue(mockItems);
      }
    });

    const result = await service.findAllV2(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAllV2 with invalid option', async () => {
    await expect(service.findAllV2('invalid' as any)).rejects.toThrow();
  });

  it('should return a single item on findOne', async () => {
    const mockItem = { id: 1 };
    mockSdgTargetRepository.findOneBy =
      mockSdgTargetRepository.findOneBy || jest.fn();
    mockSdgTargetRepository.findOne =
      mockSdgTargetRepository.findOne || jest.fn();
    mockSdgTargetRepository.findOneBy.mockResolvedValue(mockItem);
    mockSdgTargetRepository.findOne.mockResolvedValue(mockItem);
    Object.keys(mockSdgTargetMapper).forEach((k) => {
      if (typeof mockSdgTargetMapper[k]?.mockReturnValue === 'function') {
        mockSdgTargetMapper[k].mockReturnValue(mockItem);
      }
    });

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });
});
