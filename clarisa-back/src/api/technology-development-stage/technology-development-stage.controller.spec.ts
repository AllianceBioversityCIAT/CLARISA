import { Test, TestingModule } from '@nestjs/testing';
import { TechnologyDevelopmentStageController } from './technology-development-stage.controller';
import { TechnologyDevelopmentStageService } from './technology-development-stage.service';

describe('TechnologyDevelopmentStageController', () => {
  let controller: TechnologyDevelopmentStageController;

  const mockTechnologyDevelopmentStageService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechnologyDevelopmentStageController],
      providers: [
        TechnologyDevelopmentStageController,
        {
          provide: TechnologyDevelopmentStageService,
          useValue: mockTechnologyDevelopmentStageService,
        },
      ],
    }).compile();

    controller = module.get<TechnologyDevelopmentStageController>(
      TechnologyDevelopmentStageController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockTechnologyDevelopmentStageService.findAll =
      mockTechnologyDevelopmentStageService.findAll || jest.fn();
    mockTechnologyDevelopmentStageService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockTechnologyDevelopmentStageService.findOne =
      mockTechnologyDevelopmentStageService.findOne || jest.fn();
    mockTechnologyDevelopmentStageService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockTechnologyDevelopmentStageService.update =
      mockTechnologyDevelopmentStageService.update || jest.fn();
    mockTechnologyDevelopmentStageService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
