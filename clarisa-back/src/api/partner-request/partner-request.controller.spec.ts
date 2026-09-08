import { Test, TestingModule } from '@nestjs/testing';
import { PartnerRequestController } from './partner-request.controller';
import { PartnerRequestService } from './partner-request.service';
import { CompositeAuthGuard } from '../../shared/guards/composite-auth.guard';
import { HybridAuthorizationGuard } from '../../shared/guards/hybrid-authorization.guard';

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
      .overrideGuard(CompositeAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(HybridAuthorizationGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<PartnerRequestController>(PartnerRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockPartnerRequestService.findAll.mockResolvedValue([]);

    await controller.findAll('pending', 'all', 'active' as any);
    expect(mockPartnerRequestService.findAll).toHaveBeenCalledWith(
      'pending',
      'all',
      'active',
    );
  });

  it('should call service on stadisticsfindAll', async () => {
    mockPartnerRequestService.statisticsPartnerRequest.mockResolvedValue({});

    await controller.stadisticsfindAll('all');
    expect(
      mockPartnerRequestService.statisticsPartnerRequest,
    ).toHaveBeenCalledWith('all');
  });

  it('should call service on findAllMis', async () => {
    mockPartnerRequestService.findAll.mockResolvedValue([]);

    await controller.findAllMis('pending', 'clarisa');
    expect(mockPartnerRequestService.findAll).toHaveBeenCalledWith(
      'pending',
      'clarisa',
    );
  });

  it('should call service on findOne', async () => {
    mockPartnerRequestService.findOne.mockResolvedValue({ id: 1 });

    await controller.findOne(1);
    expect(mockPartnerRequestService.findOne).toHaveBeenCalledWith(1);
  });

  it('should call service on createPartnerRequest with JWT actor', async () => {
    mockPartnerRequestService.createPartnerRequest.mockResolvedValue({ id: 1 });
    const userData = { userId: 1, email: 'test@test.com' } as any;
    const dto = {} as any;

    await controller.createPartnerRequest(userData, undefined, dto, 'clarisa');
    expect(mockPartnerRequestService.createPartnerRequest).toHaveBeenCalledWith(
      dto,
      { ...userData, mis: 'clarisa' },
    );
  });

  it('should resolve API-key create using body userId and key MIS', async () => {
    mockPartnerRequestService.createPartnerRequest.mockResolvedValue({ id: 1 });
    const apiKeyAuth = {
      api_key_id: 9,
      key_prefix: 'cl_prod_abcdefgh',
      mis: { id: 3, name: 'PRMS', acronym: 'PRMS' },
    };
    const dto = { userId: 42, externalUserMail: 'bot@example.com' } as any;

    await controller.createPartnerRequest(
      undefined,
      apiKeyAuth,
      dto,
      undefined,
    );
    expect(mockPartnerRequestService.createPartnerRequest).toHaveBeenCalledWith(
      dto,
      {
        userId: 42,
        email: 'bot@example.com',
        permissions: '',
        mis: 'PRMS',
      },
    );
  });

  it('should call service on respondPartnerRequest', async () => {
    mockPartnerRequestService.respondPartnerRequest.mockResolvedValue({});
    const userData = { userId: 1, email: 'test@test.com' } as any;
    const dto = {} as any;

    await controller.respondPartnerRequest(userData, undefined, dto);
    expect(
      mockPartnerRequestService.respondPartnerRequest,
    ).toHaveBeenCalledWith(dto, userData);
  });

  it('should call service on updatePartnerRequest', async () => {
    mockPartnerRequestService.updatePartnerRequest.mockResolvedValue({});
    const userData = { userId: 1, email: 'test@test.com' } as any;
    const dto = {} as any;

    await controller.updatePartnerRequest(userData, undefined, dto);
    expect(mockPartnerRequestService.updatePartnerRequest).toHaveBeenCalledWith(
      dto,
      userData,
    );
  });

  it('should call service on createBulk', async () => {
    mockPartnerRequestService.createBulk.mockResolvedValue([]);
    const dto = {} as any;

    await controller.createBulk(dto);
    expect(mockPartnerRequestService.createBulk).toHaveBeenCalledWith(dto);
  });
});
