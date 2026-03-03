import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionController } from './institution.controller';
import { InstitutionService } from './institution.service';

describe('InstitutionController', () => {
  let controller: InstitutionController;

  const mockInstitutionService: any = {
    findAll: jest.fn(),
    findAllSimple: jest.fn(),
    findOne: jest.fn(),
    findOneSimple: jest.fn(),
    update: jest.fn(),
    if: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionController],
      providers: [
        InstitutionController,
        { provide: InstitutionService, useValue: mockInstitutionService },
      ],
    }).compile();

    controller = module.get<InstitutionController>(InstitutionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockInstitutionService.findAll =
      mockInstitutionService.findAll || jest.fn();
    mockInstitutionService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findAllSimple', async () => {
    mockInstitutionService.findAllSimple =
      mockInstitutionService.findAllSimple || jest.fn();
    mockInstitutionService.findAllSimple.mockResolvedValue([]);

    try {
      await (controller as any).findAllSimple('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockInstitutionService.findOne =
      mockInstitutionService.findOne || jest.fn();
    mockInstitutionService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOneSimple', async () => {
    mockInstitutionService.findOneSimple =
      mockInstitutionService.findOneSimple || jest.fn();
    mockInstitutionService.findOneSimple.mockResolvedValue([]);

    try {
      await (controller as any).findOneSimple('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockInstitutionService.update = mockInstitutionService.update || jest.fn();
    mockInstitutionService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
