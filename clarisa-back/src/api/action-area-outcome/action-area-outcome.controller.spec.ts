import { Test, TestingModule } from '@nestjs/testing';
import { ActionAreaOutcomeController } from './action-area-outcome.controller';
import { ActionAreaOutcomeService } from './action-area-outcome.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateActionAreaOutcomeDto } from './dto/update-action-area-outcome.dto';
import { ActionAreaOutcome } from './entities/action-area-outcome.entity';
import { OneActionAreaOutcomeDto } from './dto/one-action-area-outcome.dto';
import { ActionAreaOutcomeDto } from './dto/action-area-outcome.dto';

describe('ActionAreaOutcomeController', () => {
  let controller: ActionAreaOutcomeController;
  let service: ActionAreaOutcomeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionAreaOutcomeController],
      providers: [
        {
          provide: ActionAreaOutcomeService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ActionAreaOutcomeController>(
      ActionAreaOutcomeController,
    );
    service = module.get<ActionAreaOutcomeService>(ActionAreaOutcomeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of action area outcomes', async () => {
      const result: ActionAreaOutcomeDto[] = [
        {
          id: 1,
          actionAreaId: 1,
          outcomeIndicatorSMOcode: '',
          actionAreaName: '',
          outcomeId: 0,
          outcomeSMOcode: '',
          outcomeStatement: '',
          outcomeIndicatorId: 0,
          outcomeIndicatorStatement: '',
        },
        {
          id: 2,
          actionAreaId: 2,
          outcomeIndicatorSMOcode: '',
          actionAreaName: '',
          outcomeId: 0,
          outcomeSMOcode: '',
          outcomeStatement: '',
          outcomeIndicatorId: 0,
          outcomeIndicatorStatement: '',
        },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(result);

      expect(await controller.findAll(FindAllOptions.SHOW_ONLY_ACTIVE)).toBe(
        result,
      );
    });
  });

  describe('findOne', () => {
    it('should return a single action area outcome', async () => {
      const result: OneActionAreaOutcomeDto = {
        id: 1,
        smo_code: '',
        outcome_statement: '',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(result);

      expect(await controller.findOne(1)).toBe(result);
    });
  });

  describe('update', () => {
    it('should update and return the updated action area outcomes', async () => {
      const updateDtoList: UpdateActionAreaOutcomeDto[] = [];
      const result = [new ActionAreaOutcome()];
      jest.spyOn(service, 'update').mockResolvedValue(result);

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await controller.update(res as any, updateDtoList);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('should throw an HttpException on error', async () => {
      const updateDtoList: UpdateActionAreaOutcomeDto[] = [];
      jest.spyOn(service, 'update').mockRejectedValue(new Error('Bad Request'));

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await expect(
        controller.update(res as any, updateDtoList),
      ).rejects.toThrow('Bad Request');
    });
  });
});
