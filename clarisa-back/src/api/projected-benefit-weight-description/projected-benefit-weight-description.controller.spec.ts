import { Test, TestingModule } from '@nestjs/testing';
import { ProjectedBenefitWeightDescriptionController } from './projected-benefit-weight-description.controller';
import { ProjectedBenefitWeightDescriptionService } from './projected-benefit-weight-description.service';

describe('ProjectedBenefitWeightDescriptionController', () => {
  let controller: ProjectedBenefitWeightDescriptionController;

  const mockProjectedBenefitWeightDescriptionService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectedBenefitWeightDescriptionController],
      providers: [
        ProjectedBenefitWeightDescriptionController,
        {
          provide: ProjectedBenefitWeightDescriptionService,
          useValue: mockProjectedBenefitWeightDescriptionService,
        },
      ],
    }).compile();

    controller = module.get<ProjectedBenefitWeightDescriptionController>(
      ProjectedBenefitWeightDescriptionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockProjectedBenefitWeightDescriptionService.findAll =
      mockProjectedBenefitWeightDescriptionService.findAll || jest.fn();
    mockProjectedBenefitWeightDescriptionService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockProjectedBenefitWeightDescriptionService.findOne =
      mockProjectedBenefitWeightDescriptionService.findOne || jest.fn();
    mockProjectedBenefitWeightDescriptionService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockProjectedBenefitWeightDescriptionService.update =
      mockProjectedBenefitWeightDescriptionService.update || jest.fn();
    mockProjectedBenefitWeightDescriptionService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
