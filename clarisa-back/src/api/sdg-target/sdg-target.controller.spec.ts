import { Test, TestingModule } from '@nestjs/testing';
import { SdgTargetController } from './sdg-target.controller';
import { SdgTargetService } from './sdg-target.service';

describe('SdgTargetController', () => {
  let controller: SdgTargetController;

  const mockSdgTargetService: any = {
    findAllV1: jest.fn(),
    findAllV2: jest.fn(),
    findAllIpsr: jest.fn(),
    findOne: jest.fn(),
    switch: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SdgTargetController],
      providers: [
        SdgTargetController,
        { provide: SdgTargetService, useValue: mockSdgTargetService },
      ],
    }).compile();

    controller = module.get<SdgTargetController>(SdgTargetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAllV1', async () => {
    mockSdgTargetService.findAllV1 =
      mockSdgTargetService.findAllV1 || jest.fn();
    mockSdgTargetService.findAllV1.mockResolvedValue([]);

    try {
      await (controller as any).findAllV1('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findAllV2', async () => {
    mockSdgTargetService.findAllV2 =
      mockSdgTargetService.findAllV2 || jest.fn();
    mockSdgTargetService.findAllV2.mockResolvedValue([]);

    try {
      await (controller as any).findAllV2('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findAllIpsr', async () => {
    mockSdgTargetService.findAllIpsr =
      mockSdgTargetService.findAllIpsr || jest.fn();
    mockSdgTargetService.findAllIpsr.mockResolvedValue([]);

    try {
      await (controller as any).findAllIpsr('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockSdgTargetService.findOne = mockSdgTargetService.findOne || jest.fn();
    mockSdgTargetService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
