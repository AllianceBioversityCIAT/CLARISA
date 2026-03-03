import { Test, TestingModule } from '@nestjs/testing';
import { QaTokenAuthController } from './qa-token-auth.controller';
import { QaTokenAuthService } from './qa-token-auth.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';

describe('QaTokenAuthController', () => {
  let controller: QaTokenAuthController;

  const mockQaTokenAuthService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockGuard: any = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QaTokenAuthController],
      providers: [
        { provide: QaTokenAuthService, useValue: mockQaTokenAuthService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<QaTokenAuthController>(QaTokenAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', () => {
    mockQaTokenAuthService.findAll.mockReturnValue([]);
    const result = controller.findAll();
    expect(mockQaTokenAuthService.findAll).toHaveBeenCalled();
  });

  it('should call service on findOne', () => {
    mockQaTokenAuthService.findOne.mockReturnValue({});
    const result = controller.findOne('1');
    expect(mockQaTokenAuthService.findOne).toHaveBeenCalledWith(1);
  });

  it('should call service on create', () => {
    const dto = { smoCode: 'test', email: 'test@test.com' } as any;
    mockQaTokenAuthService.create.mockResolvedValue({});
    const result = controller.create(dto);
    expect(mockQaTokenAuthService.create).toHaveBeenCalledWith(dto);
  });
});
