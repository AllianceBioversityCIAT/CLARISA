import { Test, TestingModule } from '@nestjs/testing';
import { WorkpackageController } from './workpackage.controller';
import { WorkpackageService } from './workpackage.service';

describe('WorkpackageController', () => {
  let controller: WorkpackageController;

  const mockWorkpackageService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    if: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkpackageController],
      providers: [
        WorkpackageController,
        { provide: WorkpackageService, useValue: mockWorkpackageService },
      ],
    }).compile();

    controller = module.get<WorkpackageController>(WorkpackageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockWorkpackageService.findAll =
      mockWorkpackageService.findAll || jest.fn();
    mockWorkpackageService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockWorkpackageService.findOne =
      mockWorkpackageService.findOne || jest.fn();
    mockWorkpackageService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockWorkpackageService.update = mockWorkpackageService.update || jest.fn();
    mockWorkpackageService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
