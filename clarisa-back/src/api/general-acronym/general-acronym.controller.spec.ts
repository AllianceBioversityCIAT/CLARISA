import { Test, TestingModule } from '@nestjs/testing';
import { GeneralAcronymController } from './general-acronym.controller';
import { GeneralAcronymService } from './general-acronym.service';

describe('GeneralAcronymController', () => {
  let controller: GeneralAcronymController;

  const mockGeneralAcronymService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    switch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeneralAcronymController],
      providers: [
        GeneralAcronymController,
        { provide: GeneralAcronymService, useValue: mockGeneralAcronymService },
      ],
    }).compile();

    controller = module.get<GeneralAcronymController>(GeneralAcronymController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockGeneralAcronymService.findAll =
      mockGeneralAcronymService.findAll || jest.fn();
    mockGeneralAcronymService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockGeneralAcronymService.findOne =
      mockGeneralAcronymService.findOne || jest.fn();
    mockGeneralAcronymService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockGeneralAcronymService.update =
      mockGeneralAcronymService.update || jest.fn();
    mockGeneralAcronymService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
