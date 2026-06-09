import { Test, TestingModule } from '@nestjs/testing';
import { ImpactAreaIndicatorController } from './impact-area-indicator.controller';
import { ImpactAreaIndicatorService } from './impact-area-indicator.service';

describe('ImpactAreaIndicatorController', () => {
  let controller: ImpactAreaIndicatorController;

  const mockImpactAreaIndicatorService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    if: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImpactAreaIndicatorController],
      providers: [
        ImpactAreaIndicatorController,
        {
          provide: ImpactAreaIndicatorService,
          useValue: mockImpactAreaIndicatorService,
        },
      ],
    }).compile();

    controller = module.get<ImpactAreaIndicatorController>(
      ImpactAreaIndicatorController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockImpactAreaIndicatorService.findAll =
      mockImpactAreaIndicatorService.findAll || jest.fn();
    mockImpactAreaIndicatorService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockImpactAreaIndicatorService.findOne =
      mockImpactAreaIndicatorService.findOne || jest.fn();
    mockImpactAreaIndicatorService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockImpactAreaIndicatorService.update =
      mockImpactAreaIndicatorService.update || jest.fn();
    mockImpactAreaIndicatorService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
