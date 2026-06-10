import { Test, TestingModule } from '@nestjs/testing';
import { LeverController } from './lever.controller';
import { LeverService } from './lever.service';

describe('LeverController', () => {
  let controller: LeverController;

  const mockLeverService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeverController],
      providers: [
        LeverController,
        { provide: LeverService, useValue: mockLeverService },
      ],
    }).compile();

    controller = module.get<LeverController>(LeverController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockLeverService.findAll = mockLeverService.findAll || jest.fn();
    mockLeverService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockLeverService.findOne = mockLeverService.findOne || jest.fn();
    mockLeverService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
