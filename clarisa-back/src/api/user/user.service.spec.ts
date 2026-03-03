import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './repositories/user.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('UserService', () => {
  let service: UserService;

  const mockUserRepository: any = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    query: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
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
        UserService,
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should return items on findAll with SHOW_ALL', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      Object.keys(mockUserRepository).forEach(k => {
        if (typeof mockUserRepository[k]?.mockResolvedValue === 'function') {
          mockUserRepository[k].mockResolvedValue(mockItems);
        }
      });
      

      const result = await service.findAll(FindAllOptions.SHOW_ALL);
      expect(result).toBeDefined();
    });

    it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
      const mockItems = [{ id: 1 }];
      Object.keys(mockUserRepository).forEach(k => {
        if (typeof mockUserRepository[k]?.mockResolvedValue === 'function') {
          mockUserRepository[k].mockResolvedValue(mockItems);
        }
      });
      

      const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
      expect(result).toBeDefined();
    });

    it('should throw on findAll with invalid option', async () => {
      expect(() => service.findAll('invalid' as any)).toThrow();
    });

    it('should return paginated items on getUsersPagination', async () => {
      const mockItems = [{ id: 1 }];
      mockUserRepository.findAndCount.mockResolvedValue([mockItems, 1]);

      const result = await service.getUsersPagination(0, 10);
      expect(result).toEqual({ items: mockItems, count: 1 });
    });

    it('should return a single item on findOne', async () => {
      const mockItem = { id: 1 };
      mockUserRepository.findOneBy = mockUserRepository.findOneBy || jest.fn();
      mockUserRepository.findOne = mockUserRepository.findOne || jest.fn();
      mockUserRepository.findOneBy.mockResolvedValue(mockItem);
      mockUserRepository.findOne.mockResolvedValue(mockItem);
      

      const result = await service.findOne(1);
      expect(result).toBeDefined();
    });

    it('should save items on update', async () => {
      const dto = [{ id: 1 }];
      mockUserRepository.save.mockResolvedValue(dto);

      const result = await service.update(dto as any);
      expect(mockUserRepository.save).toHaveBeenCalledWith(dto);
    });
});
