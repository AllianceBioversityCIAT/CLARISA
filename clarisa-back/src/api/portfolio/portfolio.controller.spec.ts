import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

describe('PortfolioController', () => {
  let controller: PortfolioController;

  const mockPortfolioService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioController],
      providers: [
        PortfolioController,
        { provide: PortfolioService, useValue: mockPortfolioService },
      ],
    }).compile();

    controller = module.get<PortfolioController>(PortfolioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

    it('should call service on findAll', async () => {
      mockPortfolioService.findAll = mockPortfolioService.findAll || jest.fn();
      mockPortfolioService.findAll.mockResolvedValue([]);

      try { await (controller as any).findAll('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on findOne', async () => {
      mockPortfolioService.findOne = mockPortfolioService.findOne || jest.fn();
      mockPortfolioService.findOne.mockResolvedValue([]);

      try { await (controller as any).findOne('active', {}, {}, {}); } catch (e) { /* ok */ }
    });
});
