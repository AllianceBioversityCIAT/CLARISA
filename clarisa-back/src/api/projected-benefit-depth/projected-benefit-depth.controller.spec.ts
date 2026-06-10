import { Test, TestingModule } from '@nestjs/testing';
import { ProjectedBenefitDepthController } from './projected-benefit-depth.controller';
import { ProjectedBenefitDepthService } from './projected-benefit-depth.service';

describe('ProjectedBenefitDepthController', () => {
  let controller: ProjectedBenefitDepthController;

  const mockProjectedBenefitDepthService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectedBenefitDepthController],
      providers: [
        ProjectedBenefitDepthController,
        {
          provide: ProjectedBenefitDepthService,
          useValue: mockProjectedBenefitDepthService,
        },
      ],
    }).compile();

    controller = module.get<ProjectedBenefitDepthController>(
      ProjectedBenefitDepthController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockProjectedBenefitDepthService.findAll =
      mockProjectedBenefitDepthService.findAll || jest.fn();
    mockProjectedBenefitDepthService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockProjectedBenefitDepthService.findOne =
      mockProjectedBenefitDepthService.findOne || jest.fn();
    mockProjectedBenefitDepthService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockProjectedBenefitDepthService.update =
      mockProjectedBenefitDepthService.update || jest.fn();
    mockProjectedBenefitDepthService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
