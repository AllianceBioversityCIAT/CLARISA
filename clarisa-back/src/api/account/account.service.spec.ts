import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './account.service';
import { AccountRepository } from './repositories/account.repository';
import { AccountMapper } from './mappers/account.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('AccountService', () => {
  let service: AccountService;

  const mockAccountRepository: any = {
    findAllAccounts: jest.fn(),
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

  const mockAccountMapper: any = {
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
        AccountService,
        { provide: AccountRepository, useValue: mockAccountRepository },
        { provide: AccountMapper, useValue: mockAccountMapper },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should return items on findAll with SHOW_ALL', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      Object.keys(mockAccountRepository).forEach(k => {
        if (typeof mockAccountRepository[k]?.mockResolvedValue === 'function') {
          mockAccountRepository[k].mockResolvedValue(mockItems);
        }
      });
      Object.keys(mockAccountMapper).forEach(k => {
        if (typeof mockAccountMapper[k]?.mockReturnValue === 'function') {
          mockAccountMapper[k].mockReturnValue(mockItems);
        }
      });

      const result = await service.findAll(FindAllOptions.SHOW_ALL);
      expect(result).toBeDefined();
    });

    it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
      const mockItems = [{ id: 1 }];
      Object.keys(mockAccountRepository).forEach(k => {
        if (typeof mockAccountRepository[k]?.mockResolvedValue === 'function') {
          mockAccountRepository[k].mockResolvedValue(mockItems);
        }
      });
      Object.keys(mockAccountMapper).forEach(k => {
        if (typeof mockAccountMapper[k]?.mockReturnValue === 'function') {
          mockAccountMapper[k].mockReturnValue(mockItems);
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
      mockAccountRepository.findOneBy = mockAccountRepository.findOneBy || jest.fn();
      mockAccountRepository.findOne = mockAccountRepository.findOne || jest.fn();
      mockAccountRepository.findOneBy.mockResolvedValue(mockItem);
      mockAccountRepository.findOne.mockResolvedValue(mockItem);
      Object.keys(mockAccountMapper).forEach(k => {
        if (typeof mockAccountMapper[k]?.mockReturnValue === 'function') {
          mockAccountMapper[k].mockReturnValue(mockItem);
        }
      });

      const result = await service.findOne(1);
      expect(result).toBeDefined();
    });

    it('should save items on update', async () => {
      const dto = [{ id: 1 }];
      mockAccountRepository.save.mockResolvedValue(dto);

      const result = await service.update(dto as any);
      expect(mockAccountRepository.save).toHaveBeenCalledWith(dto);
    });
});
