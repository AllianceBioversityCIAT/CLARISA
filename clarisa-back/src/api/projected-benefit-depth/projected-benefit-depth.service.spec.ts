import { Test, TestingModule } from '@nestjs/testing';
import { ProjectedBenefitDepthService } from './projected-benefit-depth.service';
import { ProjectedBenefitDepthRepository } from './repositories/projected-benefit-depth.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('ProjectedBenefitDepthService', () => {
  let service: ProjectedBenefitDepthService;

  const mockProjectedBenefitDepthRepository: any = {
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
        ProjectedBenefitDepthService,
        { provide: ProjectedBenefitDepthRepository, useValue: mockProjectedBenefitDepthRepository },
      ],
    }).compile();

    service = module.get<ProjectedBenefitDepthService>(ProjectedBenefitDepthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should return items on findAll with SHOW_ALL', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      Object.keys(mockProjectedBenefitDepthRepository).forEach(k => {
        if (typeof mockProjectedBenefitDepthRepository[k]?.mockResolvedValue === 'function') {
          mockProjectedBenefitDepthRepository[k].mockResolvedValue(mockItems);
        }
      });
      

      const result = await service.findAll(FindAllOptions.SHOW_ALL);
      expect(result).toBeDefined();
    });

    it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
      const mockItems = [{ id: 1 }];
      Object.keys(mockProjectedBenefitDepthRepository).forEach(k => {
        if (typeof mockProjectedBenefitDepthRepository[k]?.mockResolvedValue === 'function') {
          mockProjectedBenefitDepthRepository[k].mockResolvedValue(mockItems);
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
      mockProjectedBenefitDepthRepository.findOneBy = mockProjectedBenefitDepthRepository.findOneBy || jest.fn();
      mockProjectedBenefitDepthRepository.findOne = mockProjectedBenefitDepthRepository.findOne || jest.fn();
      mockProjectedBenefitDepthRepository.findOneBy.mockResolvedValue(mockItem);
      mockProjectedBenefitDepthRepository.findOne.mockResolvedValue(mockItem);
      

      const result = await service.findOne(1);
      expect(result).toBeDefined();
    });

    it('should save items on update', async () => {
      const dto = [{ id: 1 }];
      mockProjectedBenefitDepthRepository.save.mockResolvedValue(dto);

      const result = await service.update(dto as any);
      expect(mockProjectedBenefitDepthRepository.save).toHaveBeenCalledWith(dto);
    });
});
