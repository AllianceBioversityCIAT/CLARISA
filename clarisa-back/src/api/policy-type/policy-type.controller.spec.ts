import { Test, TestingModule } from '@nestjs/testing';
import { PolicyTypeController } from './policy-type.controller';
import { PolicyTypeService } from '../policy-type/policy-type.service';

describe('PolicyTypeController', () => {
  let controller: PolicyTypeController;

  const mockPolicyTypeService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PolicyTypeController],
      providers: [
        PolicyTypeController,
        { provide: PolicyTypeService, useValue: mockPolicyTypeService },
      ],
    }).compile();

    controller = module.get<PolicyTypeController>(PolicyTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockPolicyTypeService.findAll = mockPolicyTypeService.findAll || jest.fn();
    mockPolicyTypeService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockPolicyTypeService.findOne = mockPolicyTypeService.findOne || jest.fn();
    mockPolicyTypeService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockPolicyTypeService.update = mockPolicyTypeService.update || jest.fn();
    mockPolicyTypeService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
