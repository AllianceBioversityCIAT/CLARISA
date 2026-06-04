import { Test, TestingModule } from '@nestjs/testing';
import { MisController } from './mis.controller';
import { MisService } from './mis.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';

describe('MisController', () => {
  let controller: MisController;

  const misServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findMetadataById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MisController],
      providers: [{ provide: MisService, useValue: misServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<MisController>(MisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
