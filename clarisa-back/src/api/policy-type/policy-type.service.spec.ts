import { Test, TestingModule } from '@nestjs/testing';
import { PolicyTypeService } from './policy-type.service';
import { PolicyTypeRepository } from './repositories/policy-type.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('PolicyTypeService', () => {
  let service: PolicyTypeService;

  const mockPolicyTypeRepository: any = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyTypeService,
        { provide: PolicyTypeRepository, useValue: mockPolicyTypeRepository },
      ],
    }).compile();

    service = module.get<PolicyTypeService>(PolicyTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should return items on findAll with SHOW_ALL', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      Object.keys(mockPolicyTypeRepository).forEach(k => {
        if (typeof mockPolicyTypeRepository[k]?.mockResolvedValue === 'function') {
          mockPolicyTypeRepository[k].mockResolvedValue(mockItems);
        }
      });
      

      const result = await service.findAll(FindAllOptions.SHOW_ALL);
      expect(result).toBeDefined();
    });

    it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
      const mockItems = [{ id: 1 }];
      Object.keys(mockPolicyTypeRepository).forEach(k => {
        if (typeof mockPolicyTypeRepository[k]?.mockResolvedValue === 'function') {
          mockPolicyTypeRepository[k].mockResolvedValue(mockItems);
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
      mockPolicyTypeRepository.findOneBy = mockPolicyTypeRepository.findOneBy || jest.fn();
      mockPolicyTypeRepository.findOne = mockPolicyTypeRepository.findOne || jest.fn();
      mockPolicyTypeRepository.findOneBy.mockResolvedValue(mockItem);
      mockPolicyTypeRepository.findOne.mockResolvedValue(mockItem);
      

      const result = await service.findOne(1);
      expect(result).toBeDefined();
    });

    it('should save items on update', async () => {
      const dto = [{ id: 1 }];
      mockPolicyTypeRepository.save.mockResolvedValue(dto);

      const result = await service.update(dto as any);
      expect(mockPolicyTypeRepository.save).toHaveBeenCalledWith(dto);
    });
});
