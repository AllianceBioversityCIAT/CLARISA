import { Test, TestingModule } from '@nestjs/testing';
import { CountryOfficeRequestController } from './country-office-request.controller';
import { CountryOfficeRequestService } from './country-office-request.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';

describe('CountryOfficeRequestController', () => {
  let controller: CountryOfficeRequestController;

  const mockCountryOfficeRequestService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    createCountryOfficeRequest: jest.fn(),
    respondCountryOfficeRequest: jest.fn(),
    updateCountryOfficeRequest: jest.fn(),
  };

  const mockGuard: any = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CountryOfficeRequestController],
      providers: [
        { provide: CountryOfficeRequestService, useValue: mockCountryOfficeRequestService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<CountryOfficeRequestController>(CountryOfficeRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockCountryOfficeRequestService.findAll.mockResolvedValue([]);

    const result = await controller.findAll('pending', 'all');
    expect(mockCountryOfficeRequestService.findAll).toHaveBeenCalledWith('pending', 'all');
  });

  it('should call service on findOne', async () => {
    mockCountryOfficeRequestService.findOne.mockResolvedValue({ id: 1 });

    const result = await controller.findOne(1);
    expect(mockCountryOfficeRequestService.findOne).toHaveBeenCalledWith(1);
  });

  it('should call service on createCountryOfficeRequests', async () => {
    mockCountryOfficeRequestService.createCountryOfficeRequest.mockResolvedValue({ id: 1 });
    const userData = { userId: 1, email: 'test@test.com' } as any;
    const dto = {} as any;

    const result = await controller.createCountryOfficeRequests(userData, dto, 'clarisa');
    expect(mockCountryOfficeRequestService.createCountryOfficeRequest).toHaveBeenCalledWith(
      dto,
      { ...userData, mis: 'clarisa' },
    );
  });

  it('should call service on respondCountryOfficeRequest', async () => {
    mockCountryOfficeRequestService.respondCountryOfficeRequest.mockResolvedValue({});
    const userData = { userId: 1, email: 'test@test.com' } as any;
    const dto = {} as any;

    const result = await controller.respondCountryOfficeRequest(userData, dto);
    expect(mockCountryOfficeRequestService.respondCountryOfficeRequest).toHaveBeenCalledWith(
      dto,
      userData,
    );
  });

  it('should call service on updateCountryOfficeRequest', async () => {
    mockCountryOfficeRequestService.updateCountryOfficeRequest.mockResolvedValue({});
    const userData = { userId: 1, email: 'test@test.com' } as any;
    const dto = {} as any;

    const result = await controller.updateCountryOfficeRequest(userData, dto);
    expect(mockCountryOfficeRequestService.updateCountryOfficeRequest).toHaveBeenCalledWith(
      dto,
      userData,
    );
  });
});
