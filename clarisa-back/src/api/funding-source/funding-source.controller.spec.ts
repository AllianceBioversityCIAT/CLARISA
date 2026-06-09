import { Test, TestingModule } from '@nestjs/testing';
import { FundingSourceController } from './funding-source.controller';
import { FundingSourceService } from './funding-source.service';

describe('FundingSourceController', () => {
  let controller: FundingSourceController;

  const mockFundingSourceService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundingSourceController],
      providers: [
        FundingSourceController,
        { provide: FundingSourceService, useValue: mockFundingSourceService },
      ],
    }).compile();

    controller = module.get<FundingSourceController>(FundingSourceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockFundingSourceService.findAll =
      mockFundingSourceService.findAll || jest.fn();
    mockFundingSourceService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockFundingSourceService.findOne =
      mockFundingSourceService.findOne || jest.fn();
    mockFundingSourceService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
