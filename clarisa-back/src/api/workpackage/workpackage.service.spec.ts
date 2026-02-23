import { Test, TestingModule } from '@nestjs/testing';
import { WorkpackageService } from './workpackage.service';
import { WorkpackageRepository } from './repositories/workpackage.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('WorkpackageService', () => {
  let service: WorkpackageService;

  const mockWorkpackageRepository: any = {
    findAllWorkpackages: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
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
        WorkpackageService,
        { provide: WorkpackageRepository, useValue: mockWorkpackageRepository },
      ],
    }).compile();

    service = module.get<WorkpackageService>(WorkpackageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should return items on findAll with SHOW_ALL', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      Object.keys(mockWorkpackageRepository).forEach(k => {
        if (typeof mockWorkpackageRepository[k]?.mockResolvedValue === 'function') {
          mockWorkpackageRepository[k].mockResolvedValue(mockItems);
        }
      });
      

      const result = await service.findAll(FindAllOptions.SHOW_ALL);
      expect(result).toBeDefined();
    });

    it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
      const mockItems = [{ id: 1 }];
      Object.keys(mockWorkpackageRepository).forEach(k => {
        if (typeof mockWorkpackageRepository[k]?.mockResolvedValue === 'function') {
          mockWorkpackageRepository[k].mockResolvedValue(mockItems);
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
      mockWorkpackageRepository.findOneBy = mockWorkpackageRepository.findOneBy || jest.fn();
      mockWorkpackageRepository.findOne = mockWorkpackageRepository.findOne || jest.fn();
      mockWorkpackageRepository.findOneBy.mockResolvedValue(mockItem);
      mockWorkpackageRepository.findOne.mockResolvedValue(mockItem);
      

      const result = await service.findOne(1);
      expect(result).toBeDefined();
    });

    it('should save items on update', async () => {
      const dto = [{ id: 1 }];
      mockWorkpackageRepository.save.mockResolvedValue(dto);

      const result = await service.update(dto as any);
      expect(mockWorkpackageRepository.save).toHaveBeenCalledWith(dto);
    });
});
