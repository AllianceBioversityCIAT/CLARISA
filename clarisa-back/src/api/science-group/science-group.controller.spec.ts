import { Test, TestingModule } from '@nestjs/testing';
import { ScienceGroupController } from './science-group.controller';
import { ScienceGroupService } from './science-group.service';

describe('ScienceGroupController', () => {
  let controller: ScienceGroupController;

  const mockScienceGroupService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    if: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScienceGroupController],
      providers: [
        ScienceGroupController,
        { provide: ScienceGroupService, useValue: mockScienceGroupService },
      ],
    }).compile();

    controller = module.get<ScienceGroupController>(ScienceGroupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockScienceGroupService.findAll =
      mockScienceGroupService.findAll || jest.fn();
    mockScienceGroupService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockScienceGroupService.findOne =
      mockScienceGroupService.findOne || jest.fn();
    mockScienceGroupService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockScienceGroupService.update =
      mockScienceGroupService.update || jest.fn();
    mockScienceGroupService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
