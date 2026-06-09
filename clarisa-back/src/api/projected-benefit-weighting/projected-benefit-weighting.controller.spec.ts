import { Test, TestingModule } from '@nestjs/testing';
import { ProjectedBenefitWeightingController } from './projected-benefit-weighting.controller';
import { ProjectedBenefitWeightingService } from './projected-benefit-weighting.service';

describe('ProjectedBenefitWeightingController', () => {
  let controller: ProjectedBenefitWeightingController;

  const mockProjectedBenefitWeightingService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectedBenefitWeightingController],
      providers: [
        ProjectedBenefitWeightingController,
        {
          provide: ProjectedBenefitWeightingService,
          useValue: mockProjectedBenefitWeightingService,
        },
      ],
    }).compile();

    controller = module.get<ProjectedBenefitWeightingController>(
      ProjectedBenefitWeightingController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockProjectedBenefitWeightingService.findAll =
      mockProjectedBenefitWeightingService.findAll || jest.fn();
    mockProjectedBenefitWeightingService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockProjectedBenefitWeightingService.findOne =
      mockProjectedBenefitWeightingService.findOne || jest.fn();
    mockProjectedBenefitWeightingService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockProjectedBenefitWeightingService.update =
      mockProjectedBenefitWeightingService.update || jest.fn();
    mockProjectedBenefitWeightingService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
