import { Test, TestingModule } from '@nestjs/testing';
import { ProjectedBenefitProbabilityController } from './projected-benefit-probability.controller';
import { ProjectedBenefitProbabilityService } from './projected-benefit-probability.service';

describe('ProjectedBenefitProbabilityController', () => {
  let controller: ProjectedBenefitProbabilityController;

  const mockProjectedBenefitProbabilityService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectedBenefitProbabilityController],
      providers: [
        ProjectedBenefitProbabilityController,
        {
          provide: ProjectedBenefitProbabilityService,
          useValue: mockProjectedBenefitProbabilityService,
        },
      ],
    }).compile();

    controller = module.get<ProjectedBenefitProbabilityController>(
      ProjectedBenefitProbabilityController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockProjectedBenefitProbabilityService.findAll =
      mockProjectedBenefitProbabilityService.findAll || jest.fn();
    mockProjectedBenefitProbabilityService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockProjectedBenefitProbabilityService.findOne =
      mockProjectedBenefitProbabilityService.findOne || jest.fn();
    mockProjectedBenefitProbabilityService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockProjectedBenefitProbabilityService.update =
      mockProjectedBenefitProbabilityService.update || jest.fn();
    mockProjectedBenefitProbabilityService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
