import { Test, TestingModule } from '@nestjs/testing';
import { CgiarEntityService } from './cgiar-entity.service';
import { CgiarEntityRepository } from './repositories/cgiar-entity.repository';
import { CenterService } from '../center/center.service';
import { CgiarEntityMapper } from './mappers/cgiar-entity.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('CgiarEntityService', () => {
  let service: CgiarEntityService;

  const mockQueryBuilder: any = {
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
  };

  const mockCgiarEntityRepository: any = {
    find: jest.fn(),
    query: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockCenterService: any = {
    findAllV1: jest.fn().mockResolvedValue([]),
    findOneV1: jest.fn(),
  };

  const mockCgiarEntityMapper: any = {
    classListToDtoV1List: jest.fn().mockReturnValue([]),
    classToDtoV1: jest.fn().mockImplementation((x) => x || {}),
    classListToDtoV2List: jest.fn().mockReturnValue([]),
    classToDtoV2: jest.fn().mockImplementation((x) => x || {}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CgiarEntityService,
        { provide: CgiarEntityRepository, useValue: mockCgiarEntityRepository },
        { provide: CenterService, useValue: mockCenterService },
        { provide: CgiarEntityMapper, useValue: mockCgiarEntityMapper },
      ],
    }).compile();

    service = module.get<CgiarEntityService>(CgiarEntityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAllV1 with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    mockCgiarEntityRepository.find.mockResolvedValue(mockItems);
    mockCenterService.findAllV1.mockResolvedValue([]);
    mockCgiarEntityMapper.classListToDtoV1List.mockReturnValue(mockItems);

    const result = await service.findAllV1(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAllV1 with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    mockCgiarEntityRepository.find.mockResolvedValue(mockItems);
    mockCenterService.findAllV1.mockResolvedValue([]);
    mockCgiarEntityMapper.classListToDtoV1List.mockReturnValue(mockItems);

    const result = await service.findAllV1(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAllV1 with invalid option', async () => {
    mockCenterService.findAllV1.mockResolvedValue([]);
    await expect(service.findAllV1('invalid' as any)).rejects.toThrow();
  });

  it('should return a single item on findOneV1', async () => {
    const mockItem = { id: 1 };
    mockCgiarEntityRepository.query.mockResolvedValue([{ max: 100 }]);
    mockCgiarEntityRepository.findOneBy.mockResolvedValue(mockItem);
    mockCgiarEntityMapper.classToDtoV1.mockReturnValue(mockItem);

    const result = await service.findOneV1(1);
    expect(result).toBeDefined();
  });

  it('should delegate to centerService.findOneV1 when id > maxId', async () => {
    mockCgiarEntityRepository.query.mockResolvedValue([{ max: 10 }]);
    mockCenterService.findOneV1.mockResolvedValue({ id: 5 });

    const result = await service.findOneV1(15);
    expect(mockCenterService.findOneV1).toHaveBeenCalledWith(5);
  });

  it('should return items on findAllV2 with SHOW_ALL', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([]);
    mockCgiarEntityMapper.classListToDtoV2List.mockReturnValue([]);

    const result = await service.findAllV2(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAllV2 with SHOW_ONLY_ACTIVE', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([]);
    mockCgiarEntityMapper.classListToDtoV2List.mockReturnValue([]);

    const result = await service.findAllV2(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAllV2 with invalid option', async () => {
    await expect(service.findAllV2('invalid' as any)).rejects.toThrow();
  });

  it('should return a single item on findOneV2', async () => {
    const mockItem = { id: 1 };
    mockCgiarEntityRepository.findOne.mockResolvedValue(mockItem);
    mockCgiarEntityMapper.classToDtoV2.mockReturnValue(mockItem);

    const result = await service.findOneV2(1);
    expect(result).toBeDefined();
  });
});
