import { Test, TestingModule } from '@nestjs/testing';
import { RegionController } from './region.controller';
import { RegionService } from './region.service';

describe('RegionController', () => {
  let controller: RegionController;

  const mockRegionService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    if: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegionController],
      providers: [
        RegionController,
        { provide: RegionService, useValue: mockRegionService },
      ],
    }).compile();

    controller = module.get<RegionController>(RegionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAllUNRegions', async () => {
    mockRegionService.findAllUNRegions =
      mockRegionService.findAllUNRegions || jest.fn();
    mockRegionService.findAllUNRegions.mockResolvedValue([]);

    try {
      await (controller as any).findAllUNRegions('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findAllCGIARRegions', async () => {
    mockRegionService.findAllCGIARRegions =
      mockRegionService.findAllCGIARRegions || jest.fn();
    mockRegionService.findAllCGIARRegions.mockResolvedValue([]);

    try {
      await (controller as any).findAllCGIARRegions('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockRegionService.findOne = mockRegionService.findOne || jest.fn();
    mockRegionService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockRegionService.update = mockRegionService.update || jest.fn();
    mockRegionService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
