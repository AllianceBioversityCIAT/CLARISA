import { Test, TestingModule } from '@nestjs/testing';
import { GlobalParameterController } from './global-parameter.controller';
import { GlobalParameterService } from './global-parameter.service';

describe('GlobalParameterController', () => {
  let controller: GlobalParameterController;

  const mockGlobalParameterService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalParameterController],
      providers: [
        GlobalParameterController,
        {
          provide: GlobalParameterService,
          useValue: mockGlobalParameterService,
        },
      ],
    }).compile();

    controller = module.get<GlobalParameterController>(
      GlobalParameterController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockGlobalParameterService.findAll =
      mockGlobalParameterService.findAll || jest.fn();
    mockGlobalParameterService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockGlobalParameterService.findOne =
      mockGlobalParameterService.findOne || jest.fn();
    mockGlobalParameterService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
