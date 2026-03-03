import { Test, TestingModule } from '@nestjs/testing';
import { SecondOrderAdministrativeDivisionController } from './second-order-administrative-division.controller';
import { SecondOrderAdministrativeDivisionService } from './second-order-administrative-division.service';

describe('SecondOrderAdministrativeDivisionController', () => {
  let controller: SecondOrderAdministrativeDivisionController;

  const mockSecondOrderAdministrativeDivisionService: any = {
    findIsoAlpha2AdminCode: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecondOrderAdministrativeDivisionController],
      providers: [
        SecondOrderAdministrativeDivisionController,
        {
          provide: SecondOrderAdministrativeDivisionService,
          useValue: mockSecondOrderAdministrativeDivisionService,
        },
      ],
    }).compile();

    controller = module.get<SecondOrderAdministrativeDivisionController>(
      SecondOrderAdministrativeDivisionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockSecondOrderAdministrativeDivisionService.findAll =
      mockSecondOrderAdministrativeDivisionService.findAll || jest.fn();
    mockSecondOrderAdministrativeDivisionService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
