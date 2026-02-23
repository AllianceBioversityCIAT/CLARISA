import { Test, TestingModule } from '@nestjs/testing';
import { RegionService } from './region.service';
import { RegionRepository } from './repositories/region.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { RegionTypeEnum } from '../../shared/entities/enums/region-types';

describe('RegionService', () => {
  let service: RegionService;

  const mockRegionRepository: any = {
    findRegionsByType: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    query: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegionService,
        { provide: RegionRepository, useValue: mockRegionRepository },
      ],
    }).compile();

    service = module.get<RegionService>(RegionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with CGIAR_REGION and SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    mockRegionRepository.findRegionsByType.mockResolvedValue(mockItems);

    const result = await service.findAll(
      RegionTypeEnum.CGIAR_REGION,
      FindAllOptions.SHOW_ALL,
    );
    expect(result).toBeDefined();
    expect(mockRegionRepository.findRegionsByType).toHaveBeenCalledWith(
      RegionTypeEnum.CGIAR_REGION,
      FindAllOptions.SHOW_ALL,
    );
  });

  it('should return active items on findAll with UN_REGION and SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    mockRegionRepository.findRegionsByType.mockResolvedValue(mockItems);

    const result = await service.findAll(
      RegionTypeEnum.UN_REGION,
      FindAllOptions.SHOW_ONLY_ACTIVE,
    );
    expect(result).toBeDefined();
  });

  it('should throw on findAll with invalid option', async () => {
    await expect(
      service.findAll(RegionTypeEnum.CGIAR_REGION, 'invalid' as any),
    ).rejects.toThrow();
  });

  it('should return a single item on findOne', async () => {
    const mockItem = { id: 1 };
    mockRegionRepository.findOneBy.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });

  it('should save items on update', async () => {
    const dto = [{ id: 1 }];
    mockRegionRepository.save.mockResolvedValue(dto);

    const result = await service.update(dto as any);
    expect(mockRegionRepository.save).toHaveBeenCalledWith(dto);
  });
});
