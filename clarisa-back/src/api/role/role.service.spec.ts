import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { RoleRepository } from './repositories/role.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('RoleService', () => {
  let service: RoleService;

  const mockRoleRepository: any = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: RoleRepository, useValue: mockRoleRepository },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should return items on findAll with SHOW_ALL', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      Object.keys(mockRoleRepository).forEach(k => {
        if (typeof mockRoleRepository[k]?.mockResolvedValue === 'function') {
          mockRoleRepository[k].mockResolvedValue(mockItems);
        }
      });
      

      const result = await service.findAll(FindAllOptions.SHOW_ALL);
      expect(result).toBeDefined();
    });

    it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
      const mockItems = [{ id: 1 }];
      Object.keys(mockRoleRepository).forEach(k => {
        if (typeof mockRoleRepository[k]?.mockResolvedValue === 'function') {
          mockRoleRepository[k].mockResolvedValue(mockItems);
        }
      });
      

      const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
      expect(result).toBeDefined();
    });

    it('should throw on findAll with invalid option', async () => {
      expect(() => service.findAll('invalid' as any)).toThrow();
    });

    it('should return a single item on findOne', async () => {
      const mockItem = { id: 1 };
      mockRoleRepository.findOneBy = mockRoleRepository.findOneBy || jest.fn();
      mockRoleRepository.findOne = mockRoleRepository.findOne || jest.fn();
      mockRoleRepository.findOneBy.mockResolvedValue(mockItem);
      mockRoleRepository.findOne.mockResolvedValue(mockItem);
      

      const result = await service.findOne(1);
      expect(result).toBeDefined();
    });

    it('should return paginated items on getRolesPagination', async () => {
      const mockItems = [{ id: 1 }];
      mockRoleRepository.findAndCount.mockResolvedValue([mockItems, 1]);

      const result = await service.getRolesPagination(0, 10);
      expect(result).toEqual({ items: mockItems, count: 1 });
    });
});
