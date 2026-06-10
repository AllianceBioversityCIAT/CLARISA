import { Test, TestingModule } from '@nestjs/testing';
import { MisController } from './mis.controller';
import { MisService } from './mis.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';

describe('MisController', () => {
  let controller: MisController;

  const mockMisService: any = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findMetadataById: jest.fn(),
  };

  const mockGuard: any = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MisController],
      providers: [{ provide: MisService, useValue: mockMisService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<MisController>(MisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on create', async () => {
    mockMisService.create.mockResolvedValue({ id: 1 });
    const userData = { userId: 1, email: 'test@test.com' } as any;
    const dto = { acronym: 'TEST', name: 'Test MIS' } as any;

    await controller.create(userData, dto);
    expect(mockMisService.create).toHaveBeenCalledWith(dto, userData);
  });

  it('should call service on findAll', async () => {
    mockMisService.findAll.mockResolvedValue([]);

    await controller.findAll('active' as any);
    expect(mockMisService.findAll).toHaveBeenCalledWith('active');
  });

  it('should call service on findOne', async () => {
    mockMisService.findOne.mockResolvedValue({ id: 1 });

    await controller.findOne(1);
    expect(mockMisService.findOne).toHaveBeenCalledWith(1);
  });

  it('should call service on findMetadataById', async () => {
    mockMisService.findMetadataById.mockResolvedValue({ id: 1 });

    await controller.findMetadataById(1);
    expect(mockMisService.findMetadataById).toHaveBeenCalledWith(1);
  });
});
