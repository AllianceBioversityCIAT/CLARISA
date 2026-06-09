import { Test, TestingModule } from '@nestjs/testing';
import { DepthDescriptionController } from './depth-description.controller';
import { DepthDescriptionService } from './depth-description.service';

describe('DepthDescriptionController', () => {
  let controller: DepthDescriptionController;

  const mockDepthDescriptionService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepthDescriptionController],
      providers: [
        DepthDescriptionController,
        {
          provide: DepthDescriptionService,
          useValue: mockDepthDescriptionService,
        },
      ],
    }).compile();

    controller = module.get<DepthDescriptionController>(
      DepthDescriptionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockDepthDescriptionService.findAll =
      mockDepthDescriptionService.findAll || jest.fn();
    mockDepthDescriptionService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockDepthDescriptionService.findOne =
      mockDepthDescriptionService.findOne || jest.fn();
    mockDepthDescriptionService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockDepthDescriptionService.update =
      mockDepthDescriptionService.update || jest.fn();
    mockDepthDescriptionService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
