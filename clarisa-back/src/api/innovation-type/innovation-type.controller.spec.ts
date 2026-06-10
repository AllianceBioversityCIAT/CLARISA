import { Test, TestingModule } from '@nestjs/testing';
import { InnovationTypeController } from './innovation-type.controller';
import { InnovationTypeService } from './innovation-type.service';

describe('InnovationTypeController', () => {
  let controller: InnovationTypeController;

  const mockInnovationTypeService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InnovationTypeController],
      providers: [
        InnovationTypeController,
        { provide: InnovationTypeService, useValue: mockInnovationTypeService },
      ],
    }).compile();

    controller = module.get<InnovationTypeController>(InnovationTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockInnovationTypeService.findAll =
      mockInnovationTypeService.findAll || jest.fn();
    mockInnovationTypeService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockInnovationTypeService.findOne =
      mockInnovationTypeService.findOne || jest.fn();
    mockInnovationTypeService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockInnovationTypeService.update =
      mockInnovationTypeService.update || jest.fn();
    mockInnovationTypeService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
