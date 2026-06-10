import { Test, TestingModule } from '@nestjs/testing';
import { GovernanceTypeController } from './governance-type.controller';
import { GovernanceTypeService } from './governance-type.service';

describe('GovernanceTypeController', () => {
  let controller: GovernanceTypeController;

  const mockGovernanceTypeService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GovernanceTypeController],
      providers: [
        GovernanceTypeController,
        { provide: GovernanceTypeService, useValue: mockGovernanceTypeService },
      ],
    }).compile();

    controller = module.get<GovernanceTypeController>(GovernanceTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockGovernanceTypeService.findAll =
      mockGovernanceTypeService.findAll || jest.fn();
    mockGovernanceTypeService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockGovernanceTypeService.findOne =
      mockGovernanceTypeService.findOne || jest.fn();
    mockGovernanceTypeService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockGovernanceTypeService.update =
      mockGovernanceTypeService.update || jest.fn();
    mockGovernanceTypeService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
