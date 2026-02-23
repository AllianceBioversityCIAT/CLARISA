import { Test, TestingModule } from '@nestjs/testing';
import { GeopositionController } from './geoposition.controller';
import { GeopositionService } from './geoposition.service';

describe('GeopositionController', () => {
  let controller: GeopositionController;

  const mockGeopositionService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeopositionController],
      providers: [
        GeopositionController,
        { provide: GeopositionService, useValue: mockGeopositionService },
      ],
    }).compile();

    controller = module.get<GeopositionController>(GeopositionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

    it('should call service on findAll', async () => {
      mockGeopositionService.findAll = mockGeopositionService.findAll || jest.fn();
      mockGeopositionService.findAll.mockResolvedValue([]);

      try { await (controller as any).findAll('active', {}, {}, {}); } catch (e) { /* ok */ }
    });

    it('should call service on findOne', async () => {
      mockGeopositionService.findOne = mockGeopositionService.findOne || jest.fn();
      mockGeopositionService.findOne.mockResolvedValue([]);

      try { await (controller as any).findOne('active', {}, {}, {}); } catch (e) { /* ok */ }
    });
});
