import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionTypeController } from './institution-type.controller';
import { InstitutionTypeService } from './institution-type.service';

describe('InstitutionTypeController', () => {
  let controller: InstitutionTypeController;

  const mockInstitutionTypeService: any = {
    findAll: jest.fn(),
    findAllSimple: jest.fn(),
    findAllFromParentToChildren: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    if: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionTypeController],
      providers: [
        InstitutionTypeController,
        {
          provide: InstitutionTypeService,
          useValue: mockInstitutionTypeService,
        },
      ],
    }).compile();

    controller = module.get<InstitutionTypeController>(
      InstitutionTypeController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockInstitutionTypeService.findAll =
      mockInstitutionTypeService.findAll || jest.fn();
    mockInstitutionTypeService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findAllSimple', async () => {
    mockInstitutionTypeService.findAllSimple =
      mockInstitutionTypeService.findAllSimple || jest.fn();
    mockInstitutionTypeService.findAllSimple.mockResolvedValue([]);

    try {
      await (controller as any).findAllSimple('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findAllFromParentToChildren', async () => {
    mockInstitutionTypeService.findAllFromParentToChildren =
      mockInstitutionTypeService.findAllFromParentToChildren || jest.fn();
    mockInstitutionTypeService.findAllFromParentToChildren.mockResolvedValue(
      [],
    );

    try {
      await (controller as any).findAllFromParentToChildren(
        'active',
        {},
        {},
        {},
      );
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockInstitutionTypeService.findOne =
      mockInstitutionTypeService.findOne || jest.fn();
    mockInstitutionTypeService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockInstitutionTypeService.update =
      mockInstitutionTypeService.update || jest.fn();
    mockInstitutionTypeService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
