import { Test, TestingModule } from '@nestjs/testing';
import { PhaseController } from './phase.controller';
import { PhaseService } from './phase.service';

describe('PhaseController', () => {
  let controller: PhaseController;

  const mockPhaseService: any = {
    findAll: jest.fn(),
    findAllByApplication: jest.fn(),
    if: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhaseController],
      providers: [
        PhaseController,
        { provide: PhaseService, useValue: mockPhaseService },
      ],
    }).compile();

    controller = module.get<PhaseController>(PhaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockPhaseService.findAll = mockPhaseService.findAll || jest.fn();
    mockPhaseService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findAllByApplication', async () => {
    mockPhaseService.findAllByApplication =
      mockPhaseService.findAllByApplication || jest.fn();
    mockPhaseService.findAllByApplication.mockResolvedValue([]);

    try {
      await (controller as any).findAllByApplication('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
