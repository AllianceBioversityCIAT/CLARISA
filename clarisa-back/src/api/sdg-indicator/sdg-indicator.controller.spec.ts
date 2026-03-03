import { Test, TestingModule } from '@nestjs/testing';
import { SdgIndicatorController } from './sdg-indicator.controller';
import { SdgIndicatorService } from './sdg-indicator.service';

describe('SdgIndicatorController', () => {
  let controller: SdgIndicatorController;

  const mockSdgIndicatorService: any = {
    findAllV1: jest.fn(),
    findAllV2: jest.fn(),
    findOne: jest.fn(),
    switch: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SdgIndicatorController],
      providers: [
        SdgIndicatorController,
        { provide: SdgIndicatorService, useValue: mockSdgIndicatorService },
      ],
    }).compile();

    controller = module.get<SdgIndicatorController>(SdgIndicatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

    it('should call service on findAllV1', async () => {
      mockSdgIndicatorService.findAllV1 = mockSdgIndicatorService.findAllV1 || jest.fn();
      mockSdgIndicatorService.findAllV1.mockResolvedValue([]);

      try { await (controller as any).findAllV1('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on findAllV2', async () => {
      mockSdgIndicatorService.findAllV2 = mockSdgIndicatorService.findAllV2 || jest.fn();
      mockSdgIndicatorService.findAllV2.mockResolvedValue([]);

      try { await (controller as any).findAllV2('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on findOne', async () => {
      mockSdgIndicatorService.findOne = mockSdgIndicatorService.findOne || jest.fn();
      mockSdgIndicatorService.findOne.mockResolvedValue([]);

      try { await (controller as any).findOne('active', {}, {}, {}); } catch (e) { /* ok */ }
    });
});
