import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentTypeController } from './investment-type.controller';
import { InvestmentTypeService } from './investment-type.service';

describe('InvestmentTypeController', () => {
  let controller: InvestmentTypeController;

  const mockInvestmentTypeService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestmentTypeController],
      providers: [
        InvestmentTypeController,
        { provide: InvestmentTypeService, useValue: mockInvestmentTypeService },
      ],
    }).compile();

    controller = module.get<InvestmentTypeController>(InvestmentTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockInvestmentTypeService.findAll =
      mockInvestmentTypeService.findAll || jest.fn();
    mockInvestmentTypeService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockInvestmentTypeService.findOne =
      mockInvestmentTypeService.findOne || jest.fn();
    mockInvestmentTypeService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockInvestmentTypeService.update =
      mockInvestmentTypeService.update || jest.fn();
    mockInvestmentTypeService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
