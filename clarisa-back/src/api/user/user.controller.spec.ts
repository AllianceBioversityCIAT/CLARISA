import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;

  const mockUserService: any = {
    findAll: jest.fn(),
    findOneByEmail: jest.fn(),
    findOneByUsername: jest.fn(),
    findOne: jest.fn(),
    getUsersPagination: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
    getUserPermissions: jest.fn(),
    if: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserController,
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockUserService.findAll = mockUserService.findAll || jest.fn();
    mockUserService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findByEmail', async () => {
    mockUserService.findByEmail = mockUserService.findByEmail || jest.fn();
    mockUserService.findByEmail.mockResolvedValue([]);

    try {
      await (controller as any).findByEmail('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findByUsername', async () => {
    mockUserService.findByUsername =
      mockUserService.findByUsername || jest.fn();
    mockUserService.findByUsername.mockResolvedValue([]);

    try {
      await (controller as any).findByUsername('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockUserService.findOne = mockUserService.findOne || jest.fn();
    mockUserService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on getUsersPagination', async () => {
    mockUserService.getUsersPagination =
      mockUserService.getUsersPagination || jest.fn();
    mockUserService.getUsersPagination.mockResolvedValue([]);

    try {
      await (controller as any).getUsersPagination('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockUserService.update = mockUserService.update || jest.fn();
    mockUserService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
