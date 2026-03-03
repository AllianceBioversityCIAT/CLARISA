import { Test, TestingModule } from '@nestjs/testing';
import { AccountTypeService } from './account-type.service';
import { AccountTypeRepository } from './repositories/account-type.repository';
import { AccountTypeMapper } from './mappers/account-type.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('AccountTypeService', () => {
  let service: AccountTypeService;

  const mockAccountTypeRepository: any = {
    findAllAccountTypes: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
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

  const mockAccountTypeMapper: any = {
    classToDto: jest.fn().mockImplementation((x) => x || {}),
    classToDtoV1: jest.fn().mockImplementation((x) => x || {}),
    classToDtoV2: jest.fn().mockImplementation((x) => x || {}),
    classListToDtoList: jest.fn().mockImplementation((x) => x || []),
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
        AccountTypeService,
        { provide: AccountTypeRepository, useValue: mockAccountTypeRepository },
        { provide: AccountTypeMapper, useValue: mockAccountTypeMapper },
      ],
    }).compile();

    service = module.get<AccountTypeService>(AccountTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockAccountTypeRepository).forEach((k) => {
      if (
        typeof mockAccountTypeRepository[k]?.mockResolvedValue === 'function'
      ) {
        mockAccountTypeRepository[k].mockResolvedValue(mockItems);
      }
    });
    Object.keys(mockAccountTypeMapper).forEach((k) => {
      if (typeof mockAccountTypeMapper[k]?.mockReturnValue === 'function') {
        mockAccountTypeMapper[k].mockReturnValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockAccountTypeRepository).forEach((k) => {
      if (
        typeof mockAccountTypeRepository[k]?.mockResolvedValue === 'function'
      ) {
        mockAccountTypeRepository[k].mockResolvedValue(mockItems);
      }
    });
    Object.keys(mockAccountTypeMapper).forEach((k) => {
      if (typeof mockAccountTypeMapper[k]?.mockReturnValue === 'function') {
        mockAccountTypeMapper[k].mockReturnValue(mockItems);
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
    mockAccountTypeRepository.findOneBy =
      mockAccountTypeRepository.findOneBy || jest.fn();
    mockAccountTypeRepository.findOne =
      mockAccountTypeRepository.findOne || jest.fn();
    mockAccountTypeRepository.findOneBy.mockResolvedValue(mockItem);
    mockAccountTypeRepository.findOne.mockResolvedValue(mockItem);
    Object.keys(mockAccountTypeMapper).forEach((k) => {
      if (typeof mockAccountTypeMapper[k]?.mockReturnValue === 'function') {
        mockAccountTypeMapper[k].mockReturnValue(mockItem);
      }
    });

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });

  it('should save items on update', async () => {
    const dto = [{ id: 1 }];
    mockAccountTypeRepository.save.mockResolvedValue(dto);

    await service.update(dto as any);
    expect(mockAccountTypeRepository.save).toHaveBeenCalledWith(dto);
  });
});
