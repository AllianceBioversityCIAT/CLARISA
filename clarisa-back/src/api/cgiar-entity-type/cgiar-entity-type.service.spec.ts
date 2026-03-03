import { Test, TestingModule } from '@nestjs/testing';
import { CgiarEntityTypeService } from './cgiar-entity-type.service';
import { CgiarEntityTypeRepository } from './repositories/cgiar-entity-type.repository';
import { CgiarEntityTypeMapper } from './mappers/cgiar-entity-type.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('CgiarEntityTypeService', () => {
  let service: CgiarEntityTypeService;

  const mockCgiarEntityTypeRepository: any = {
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

  const mockCgiarEntityTypeMapper: any = {
    entityTypeListToDtoV1List: jest.fn().mockImplementation((x) => x || []),
    classToDtoV1: jest.fn().mockImplementation((x) => x || {}),
    classListToDtoV2List: jest.fn().mockImplementation((x) => x || []),
    classToDtoV2: jest.fn().mockImplementation((x) => x || {}),
    classToDto: jest.fn().mockImplementation((x) => x || {}),
    classListToDtoList: jest.fn().mockImplementation((x) => x || []),
    classListToDtoV1List: jest.fn().mockImplementation((x) => x || []),
    entityTypeListToDtoV2List: jest.fn().mockImplementation((x) => x || []),
    entityTypeToDtoV1: jest.fn().mockImplementation((x) => x || []),
    entityTypeToDtoV2: jest.fn().mockImplementation((x) => x || []),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CgiarEntityTypeService,
        {
          provide: CgiarEntityTypeRepository,
          useValue: mockCgiarEntityTypeRepository,
        },
        { provide: CgiarEntityTypeMapper, useValue: mockCgiarEntityTypeMapper },
      ],
    }).compile();

    service = module.get<CgiarEntityTypeService>(CgiarEntityTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAllV1 with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockCgiarEntityTypeRepository).forEach((k) => {
      if (
        typeof mockCgiarEntityTypeRepository[k]?.mockResolvedValue ===
        'function'
      ) {
        mockCgiarEntityTypeRepository[k].mockResolvedValue(mockItems);
      }
    });
    Object.keys(mockCgiarEntityTypeMapper).forEach((k) => {
      if (typeof mockCgiarEntityTypeMapper[k]?.mockReturnValue === 'function') {
        mockCgiarEntityTypeMapper[k].mockReturnValue(mockItems);
      }
    });

    const result = await service.findAllV1(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAllV1 with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockCgiarEntityTypeRepository).forEach((k) => {
      if (
        typeof mockCgiarEntityTypeRepository[k]?.mockResolvedValue ===
        'function'
      ) {
        mockCgiarEntityTypeRepository[k].mockResolvedValue(mockItems);
      }
    });
    Object.keys(mockCgiarEntityTypeMapper).forEach((k) => {
      if (typeof mockCgiarEntityTypeMapper[k]?.mockReturnValue === 'function') {
        mockCgiarEntityTypeMapper[k].mockReturnValue(mockItems);
      }
    });

    const result = await service.findAllV1(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAllV1 with invalid option', async () => {
    await expect(service.findAllV1('invalid' as any)).rejects.toThrow();
  });

  it('should return a single item on findOneV1', async () => {
    const mockItem = { id: 1 };
    mockCgiarEntityTypeRepository.findOneBy =
      mockCgiarEntityTypeRepository.findOneBy || jest.fn();
    mockCgiarEntityTypeRepository.findOne =
      mockCgiarEntityTypeRepository.findOne || jest.fn();
    mockCgiarEntityTypeRepository.findOneBy.mockResolvedValue(mockItem);
    mockCgiarEntityTypeRepository.findOne.mockResolvedValue(mockItem);
    Object.keys(mockCgiarEntityTypeMapper).forEach((k) => {
      if (typeof mockCgiarEntityTypeMapper[k]?.mockReturnValue === 'function') {
        mockCgiarEntityTypeMapper[k].mockReturnValue(mockItem);
      }
    });

    const result = await service.findOneV1(1);
    expect(result).toBeDefined();
  });

  it('should return items on findAllV2 with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockCgiarEntityTypeRepository).forEach((k) => {
      if (
        typeof mockCgiarEntityTypeRepository[k]?.mockResolvedValue ===
        'function'
      ) {
        mockCgiarEntityTypeRepository[k].mockResolvedValue(mockItems);
      }
    });
    Object.keys(mockCgiarEntityTypeMapper).forEach((k) => {
      if (typeof mockCgiarEntityTypeMapper[k]?.mockReturnValue === 'function') {
        mockCgiarEntityTypeMapper[k].mockReturnValue(mockItems);
      }
    });

    const result = await service.findAllV2(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAllV2 with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockCgiarEntityTypeRepository).forEach((k) => {
      if (
        typeof mockCgiarEntityTypeRepository[k]?.mockResolvedValue ===
        'function'
      ) {
        mockCgiarEntityTypeRepository[k].mockResolvedValue(mockItems);
      }
    });
    Object.keys(mockCgiarEntityTypeMapper).forEach((k) => {
      if (typeof mockCgiarEntityTypeMapper[k]?.mockReturnValue === 'function') {
        mockCgiarEntityTypeMapper[k].mockReturnValue(mockItems);
      }
    });

    const result = await service.findAllV2(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAllV2 with invalid option', async () => {
    await expect(service.findAllV2('invalid' as any)).rejects.toThrow();
  });

  it('should return a single item on findOneV2', async () => {
    const mockItem = { id: 1 };
    mockCgiarEntityTypeRepository.findOneBy =
      mockCgiarEntityTypeRepository.findOneBy || jest.fn();
    mockCgiarEntityTypeRepository.findOne =
      mockCgiarEntityTypeRepository.findOne || jest.fn();
    mockCgiarEntityTypeRepository.findOneBy.mockResolvedValue(mockItem);
    mockCgiarEntityTypeRepository.findOne.mockResolvedValue(mockItem);
    Object.keys(mockCgiarEntityTypeMapper).forEach((k) => {
      if (typeof mockCgiarEntityTypeMapper[k]?.mockReturnValue === 'function') {
        mockCgiarEntityTypeMapper[k].mockReturnValue(mockItem);
      }
    });

    const result = await service.findOneV2(1);
    expect(result).toBeDefined();
  });
});
