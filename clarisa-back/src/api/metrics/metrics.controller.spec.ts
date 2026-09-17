import { Test, TestingModule } from '@nestjs/testing';

import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;

  const mockMetricsService: any = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [{ provide: MetricsService, useValue: mockMetricsService }],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('devuelve lo que calcula el servicio, sin tocarlo', async () => {
    const metrics = {
      institutions: 10630,
      projects: 1210,
      workPackages: 344,
      countries: 248,
      initiatives: 43,
      controlLists: 41,
      generatedAt: '2026-09-17T00:00:00.000Z',
    };
    mockMetricsService.find.mockResolvedValue(metrics);

    await expect(controller.find()).resolves.toEqual(metrics);
  });
});
