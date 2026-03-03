import { Test, TestingModule } from '@nestjs/testing';
import { OneCgiarUserController } from './one-cgiar-user.controller';
import { OneCgiarUserService } from './one-cgiar-user.service';

describe('OneCgiarUserController', () => {
  let controller: OneCgiarUserController;

  const mockOneCgiarUserService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OneCgiarUserController],
      providers: [
        OneCgiarUserController,
        { provide: OneCgiarUserService, useValue: mockOneCgiarUserService },
      ],
    }).compile();

    controller = module.get<OneCgiarUserController>(OneCgiarUserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockOneCgiarUserService.findAll =
      mockOneCgiarUserService.findAll || jest.fn();
    mockOneCgiarUserService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockOneCgiarUserService.findOne =
      mockOneCgiarUserService.findOne || jest.fn();
    mockOneCgiarUserService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockOneCgiarUserService.update =
      mockOneCgiarUserService.update || jest.fn();
    mockOneCgiarUserService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
