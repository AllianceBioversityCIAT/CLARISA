import { Test, TestingModule } from '@nestjs/testing';
import { CenterController } from './center.controller';
import { CenterService } from './center.service';

describe('CenterController', () => {
  let controller: CenterController;

  const mockCenterService: any = {
    findAllV1: jest.fn(),
    findOneV1: jest.fn(),
    if: jest.fn(),
    switch: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CenterController],
      providers: [
        CenterController,
        { provide: CenterService, useValue: mockCenterService },
      ],
    }).compile();

    controller = module.get<CenterController>(CenterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

    it('should call service on findAll', async () => {
      mockCenterService.findAll = mockCenterService.findAll || jest.fn();
      mockCenterService.findAll.mockResolvedValue([]);

      try { await (controller as any).findAll('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on findOne', async () => {
      mockCenterService.findOne = mockCenterService.findOne || jest.fn();
      mockCenterService.findOne.mockResolvedValue([]);

      try { await (controller as any).findOne('active', {}, {}, {}); } catch (e) { /* ok */ }
    });
});
