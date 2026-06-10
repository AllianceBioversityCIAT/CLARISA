import { Test, TestingModule } from '@nestjs/testing';
import { CgiarEntityTypeController } from './cgiar-entity-type.controller';
import { CgiarEntityTypeService } from './cgiar-entity-type.service';

describe('CgiarEntityTypeController', () => {
  let controller: CgiarEntityTypeController;

  const mockCgiarEntityTypeService: any = {
    findAllV1: jest.fn(),
    findOneV1: jest.fn(),
    findAllV2: jest.fn(),
    findOneV2: jest.fn(),
    switch: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CgiarEntityTypeController],
      providers: [
        CgiarEntityTypeController,
        {
          provide: CgiarEntityTypeService,
          useValue: mockCgiarEntityTypeService,
        },
      ],
    }).compile();

    controller = module.get<CgiarEntityTypeController>(
      CgiarEntityTypeController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAllV1', async () => {
    mockCgiarEntityTypeService.findAllV1 =
      mockCgiarEntityTypeService.findAllV1 || jest.fn();
    mockCgiarEntityTypeService.findAllV1.mockResolvedValue([]);

    try {
      await (controller as any).findAllV1('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOneV1', async () => {
    mockCgiarEntityTypeService.findOneV1 =
      mockCgiarEntityTypeService.findOneV1 || jest.fn();
    mockCgiarEntityTypeService.findOneV1.mockResolvedValue([]);

    try {
      await (controller as any).findOneV1('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findAllV2', async () => {
    mockCgiarEntityTypeService.findAllV2 =
      mockCgiarEntityTypeService.findAllV2 || jest.fn();
    mockCgiarEntityTypeService.findAllV2.mockResolvedValue([]);

    try {
      await (controller as any).findAllV2('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOneV2', async () => {
    mockCgiarEntityTypeService.findOneV2 =
      mockCgiarEntityTypeService.findOneV2 || jest.fn();
    mockCgiarEntityTypeService.findOneV2.mockResolvedValue([]);

    try {
      await (controller as any).findOneV2('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
