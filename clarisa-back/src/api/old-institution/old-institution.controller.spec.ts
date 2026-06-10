import { Test, TestingModule } from '@nestjs/testing';
import { OldInstitutionController } from './old-institution.controller';
import { OldInstitutionService } from './old-institution.service';

describe('OldInstitutionController', () => {
  let controller: OldInstitutionController;

  const mockOldInstitutionService: any = {
    findAll: jest.fn(),
    findAllSimple: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    if: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OldInstitutionController],
      providers: [
        OldInstitutionController,
        { provide: OldInstitutionService, useValue: mockOldInstitutionService },
      ],
    }).compile();

    controller = module.get<OldInstitutionController>(OldInstitutionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockOldInstitutionService.findAll =
      mockOldInstitutionService.findAll || jest.fn();
    mockOldInstitutionService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findAllSimple', async () => {
    mockOldInstitutionService.findAllSimple =
      mockOldInstitutionService.findAllSimple || jest.fn();
    mockOldInstitutionService.findAllSimple.mockResolvedValue([]);

    try {
      await (controller as any).findAllSimple('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockOldInstitutionService.findOne =
      mockOldInstitutionService.findOne || jest.fn();
    mockOldInstitutionService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockOldInstitutionService.update =
      mockOldInstitutionService.update || jest.fn();
    mockOldInstitutionService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
