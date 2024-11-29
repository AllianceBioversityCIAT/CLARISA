import { Test, TestingModule } from '@nestjs/testing';
import { ActionAreaOutcomeIndicatorController } from './action-area-outcome-indicator.controller';
import { ActionAreaOutcomeIndicatorService } from './action-area-outcome-indicator.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateActionAreaOutcomeIndicatorDto } from './dto/update-action-area-outcome-indicator.dto';
import { ActionAreaOutcomeIndicator } from './entities/action-area-outcome-indicator.entity';
import { ActionAreaOutcomeIndicatorDto } from './dto/action-area-outcome-indicator.dto';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ActionAreaOutcomeIndicatorController', () => {
  let controller: ActionAreaOutcomeIndicatorController;
  let service: ActionAreaOutcomeIndicatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionAreaOutcomeIndicatorController],
      providers: [
        {
          provide: ActionAreaOutcomeIndicatorService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ActionAreaOutcomeIndicatorController>(
      ActionAreaOutcomeIndicatorController,
    );
    service = module.get<ActionAreaOutcomeIndicatorService>(
      ActionAreaOutcomeIndicatorService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of action area outcome indicators', async () => {
      const result: ActionAreaOutcomeIndicatorDto[] = [
        {
          outcomeId: 1,
          actionAreaName: 'Test',
          actionAreaOutcomeIndicatorId: 0,
          actionAreaId: 0,
          outcomeSMOcode: '',
          outcomeStatement: '',
          outcomeIndicatorId: 0,
          outcomeIndicatorsSMOcode: '',
          outcomeIndicatorStatement: '',
        },
        {
          outcomeId: 2,
          actionAreaName: 'Test 2',
          actionAreaOutcomeIndicatorId: 0,
          actionAreaId: 0,
          outcomeSMOcode: '',
          outcomeStatement: '',
          outcomeIndicatorId: 0,
          outcomeIndicatorsSMOcode: '',
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
    it('should return a single action area outcome indicator', async () => {
      const result: ActionAreaOutcomeIndicatorDto = {
        outcomeId: 1,
        actionAreaName: 'Test',
        actionAreaOutcomeIndicatorId: 0,
        actionAreaId: 0,
        outcomeSMOcode: '',
        outcomeStatement: '',
        outcomeIndicatorId: 0,
        outcomeIndicatorsSMOcode: '',
        outcomeIndicatorStatement: '',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(result);

      expect(await controller.findOne(1)).toBe(result);
    });
  });

  describe('update', () => {
    it('should update and return the updated action area outcome indicators', async () => {
      const updateDto: UpdateActionAreaOutcomeIndicatorDto[] = [];
      const result = [new ActionAreaOutcomeIndicator()];
      jest.spyOn(service, 'update').mockResolvedValue(result);

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.update(res as any, updateDto);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('should throw an HttpException on error', async () => {
      const updateDto: UpdateActionAreaOutcomeIndicatorDto[] = [];
      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new Error('Update failed'));

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await expect(controller.update(res as any, updateDto)).rejects.toThrow(
        new HttpException('Update failed', HttpStatus.BAD_REQUEST),
      );
    });
  });
});
