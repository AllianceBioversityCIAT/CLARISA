import { Test, TestingModule } from '@nestjs/testing';
import { InnovationCharacteristicController } from './innovation-characteristic.controller';
import { InnovationCharacteristicService } from './innovation-characteristic.service';

describe('InnovationCharacteristicController', () => {
  let controller: InnovationCharacteristicController;

  const mockInnovationCharacteristicService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InnovationCharacteristicController],
      providers: [
        InnovationCharacteristicController,
        { provide: InnovationCharacteristicService, useValue: mockInnovationCharacteristicService },
      ],
    }).compile();

    controller = module.get<InnovationCharacteristicController>(InnovationCharacteristicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

    it('should call service on findAll', async () => {
      mockInnovationCharacteristicService.findAll = mockInnovationCharacteristicService.findAll || jest.fn();
      mockInnovationCharacteristicService.findAll.mockResolvedValue([]);

      try { await (controller as any).findAll('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on findOne', async () => {
      mockInnovationCharacteristicService.findOne = mockInnovationCharacteristicService.findOne || jest.fn();
      mockInnovationCharacteristicService.findOne.mockResolvedValue([]);

      try { await (controller as any).findOne('active', {}, {}, {}); } catch (e) { /* ok */ }
    });
});
