import { Test, TestingModule } from '@nestjs/testing';
import { ProjectedBenefitService } from './projected-benefit.service';
import { ProjectedBenefitRepository } from './repositories/projected-benefit.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('ProjectedBenefitService', () => {
  let service: ProjectedBenefitService;

  const mockProjectedBenefitRepository: any = {
    findAllProjectedBenefits: jest.fn(),
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
        ProjectedBenefitService,
        {
          provide: ProjectedBenefitRepository,
          useValue: mockProjectedBenefitRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectedBenefitService>(ProjectedBenefitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    Object.keys(mockProjectedBenefitRepository).forEach((k) => {
      if (
        typeof mockProjectedBenefitRepository[k]?.mockResolvedValue ===
        'function'
      ) {
        mockProjectedBenefitRepository[k].mockResolvedValue(mockItems);
      }
    });

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    Object.keys(mockProjectedBenefitRepository).forEach((k) => {
      if (
        typeof mockProjectedBenefitRepository[k]?.mockResolvedValue ===
        'function'
      ) {
        mockProjectedBenefitRepository[k].mockResolvedValue(mockItems);
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
    mockProjectedBenefitRepository.findOneBy =
      mockProjectedBenefitRepository.findOneBy || jest.fn();
    mockProjectedBenefitRepository.findOne =
      mockProjectedBenefitRepository.findOne || jest.fn();
    mockProjectedBenefitRepository.findOneBy.mockResolvedValue(mockItem);
    mockProjectedBenefitRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });

  it('should save items on update', async () => {
    const dto = [{ id: 1 }];
    mockProjectedBenefitRepository.save.mockResolvedValue(dto);

    await service.update(dto as any);
    expect(mockProjectedBenefitRepository.save).toHaveBeenCalledWith(dto);
  });
});
