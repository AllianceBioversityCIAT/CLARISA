import { Test, TestingModule } from '@nestjs/testing';
import { PartnerRequestController } from './partner-request.controller';
import { PartnerRequestService } from './partner-request.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';

describe('PartnerRequestController', () => {
  let controller: PartnerRequestController;

  const mockPartnerRequestService: any = {
    findAll: jest.fn(),
    statisticsPartnerRequest: jest.fn(),
    findOne: jest.fn(),
    createPartnerRequest: jest.fn(),
    respondPartnerRequest: jest.fn(),
    updatePartnerRequest: jest.fn(),
    createBulk: jest.fn(),
  };

  const mockGuard: any = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerRequestController],
      providers: [
        { provide: PartnerRequestService, useValue: mockPartnerRequestService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<PartnerRequestController>(PartnerRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockPartnerRequestService.findAll.mockResolvedValue([]);

    const result = await controller.findAll('pending', 'all', 'active' as any);
    expect(mockPartnerRequestService.findAll).toHaveBeenCalledWith('pending', 'all', 'active');
  });

  it('should call service on stadisticsfindAll', async () => {
    mockPartnerRequestService.statisticsPartnerRequest.mockResolvedValue({});

    const result = await controller.stadisticsfindAll('all');
    expect(mockPartnerRequestService.statisticsPartnerRequest).toHaveBeenCalledWith('all');
  });

  it('should call service on findAllMis', async () => {
    mockPartnerRequestService.findAll.mockResolvedValue([]);

    const result = await controller.findAllMis('pending', 'clarisa');
    expect(mockPartnerRequestService.findAll).toHaveBeenCalledWith('pending', 'clarisa');
  });

  it('should call service on findOne', async () => {
    mockPartnerRequestService.findOne.mockResolvedValue({ id: 1 });

    const result = await controller.findOne(1);
    expect(mockPartnerRequestService.findOne).toHaveBeenCalledWith(1);
  });

  it('should call service on createPartnerRequest', async () => {
    mockPartnerRequestService.createPartnerRequest.mockResolvedValue({ id: 1 });
    const userData = { userId: 1, email: 'test@test.com' } as any;
    const dto = {} as any;

    const result = await controller.createPartnerRequest(userData, dto, 'clarisa');
    expect(mockPartnerRequestService.createPartnerRequest).toHaveBeenCalledWith(
      dto,
      { ...userData, mis: 'clarisa' },
    );
  });

  it('should call service on respondPartnerRequest', async () => {
    mockPartnerRequestService.respondPartnerRequest.mockResolvedValue({});
    const userData = { userId: 1, email: 'test@test.com' } as any;
    const dto = {} as any;

    const result = await controller.respondPartnerRequest(userData, dto);
    expect(mockPartnerRequestService.respondPartnerRequest).toHaveBeenCalledWith(dto, userData);
  });

  it('should call service on updatePartnerRequest', async () => {
    mockPartnerRequestService.updatePartnerRequest.mockResolvedValue({});
    const userData = { userId: 1, email: 'test@test.com' } as any;
    const dto = {} as any;

    const result = await controller.updatePartnerRequest(userData, dto);
    expect(mockPartnerRequestService.updatePartnerRequest).toHaveBeenCalledWith(dto, userData);
  });

  it('should call service on createBulk', async () => {
    mockPartnerRequestService.createBulk.mockResolvedValue([]);
    const dto = {} as any;

    const result = await controller.createBulk(dto);
    expect(mockPartnerRequestService.createBulk).toHaveBeenCalledWith(dto);
  });
});
