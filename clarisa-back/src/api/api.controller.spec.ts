import { Test, TestingModule } from '@nestjs/testing';
import { ApiController } from './api.controller';
import { QaTokenAuthService } from '../auth/qa-token-auth/qa-token-auth.service';
import { ApiService } from './api.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../shared/guards/permission.guard';

describe('ApiController', () => {
  let controller: ApiController;

  const mockQaTokenAuthService: any = {
    create: jest.fn(),
    findAll: jest.fn(),
  };

  const mockApiService: any = {
    findAll: jest.fn().mockReturnValue([]),
  };

  const mockGuard: any = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiController],
      providers: [
        { provide: QaTokenAuthService, useValue: mockQaTokenAuthService },
        { provide: ApiService, useValue: mockApiService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ApiController>(ApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call apiService.findAll on findAll', () => {
    controller.findAll();
    expect(mockApiService.findAll).toHaveBeenCalled();
  });

  it('should call qaTokenAuthService.create on generateQaToken', async () => {
    mockQaTokenAuthService.create.mockResolvedValue({});
    await controller.generateQaToken({} as any);
    expect(mockQaTokenAuthService.create).toHaveBeenCalled();
  });

  it('should redirect on getEntityTypes', () => {
    const mockRes = {
      redirect: jest.fn(),
    } as any;
    controller.getEntityTypes(mockRes, {});
    expect(mockRes.redirect).toHaveBeenCalled();
  });
});
