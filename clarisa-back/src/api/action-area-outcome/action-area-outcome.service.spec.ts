import { Test, TestingModule } from '@nestjs/testing';
import { ActionAreaOutcomeService } from './action-area-outcome.service';
import { ActionAreaOutcomeRepository } from './repositories/action-area-outcome.repository';
import { ActionAreaOutcomeIndicatorRepository } from '../action-area-outcome-indicator/repositories/action-area-outcome-indicator-repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
import { ActionAreaOutcomeDto } from './dto/action-area-outcome.dto';
import { OneActionAreaOutcomeDto } from './dto/one-action-area-outcome.dto';

describe('ActionAreaOutcomeService', () => {
  let service: ActionAreaOutcomeService;
  let actionAreaOutcomeRepository: ActionAreaOutcomeRepository;
  let actionAreaOutcomeIndicatorRepository: ActionAreaOutcomeIndicatorRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionAreaOutcomeService,
        {
          provide: ActionAreaOutcomeRepository,
          useValue: {
            findActionAreaOutcomeById: jest.fn(),
            save: jest.fn(),
            target: { toString: () => 'ActionAreaOutcome' },
          },
        },
        {
          provide: ActionAreaOutcomeIndicatorRepository,
          useValue: {
            findActionAreaOutcomeIndicators: jest.fn(),
            target: { toString: () => 'ActionAreaOutcomeIndicator' },
          },
        },
      ],
    }).compile();

    service = module.get<ActionAreaOutcomeService>(ActionAreaOutcomeService);
    actionAreaOutcomeRepository = module.get<ActionAreaOutcomeRepository>(
      ActionAreaOutcomeRepository,
    );
    actionAreaOutcomeIndicatorRepository =
      module.get<ActionAreaOutcomeIndicatorRepository>(
        ActionAreaOutcomeIndicatorRepository,
      );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of ActionAreaOutcomeDto', async () => {
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

      jest
        .spyOn(
          actionAreaOutcomeIndicatorRepository,
          'findActionAreaOutcomeIndicators',
        )
        .mockResolvedValue(result);

      expect(await service.findAll()).toBe(result);
    });

    it('should throw BadParamsError if option is invalid', async () => {
      await expect(
        service.findAll('INVALID_OPTION' as FindAllOptions),
      ).rejects.toThrow(BadParamsError);
    });
  });

  describe('findOne', () => {
    it('should return an ActionAreaOutcomeDto', async () => {
      const result: OneActionAreaOutcomeDto = {
        id: 1,
        smo_code: '',
        outcome_statement: '',
      };

      jest
        .spyOn(actionAreaOutcomeRepository, 'findActionAreaOutcomeById')
        .mockResolvedValue(result);

      expect(await service.findOne(1)).toBe(result);
    });

    it('should throw ClarisaEntityNotFoundError if outcome not found', async () => {
      jest
        .spyOn(actionAreaOutcomeRepository, 'findActionAreaOutcomeById')
        .mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(
        ClarisaEntityNotFoundError.messageRegex,
      );
    });
  });

  describe('update', () => {
    it('should update and return the updated ActionAreaOutcomeDto', async () => {
      const updateDto = [{ id: 1, name: 'Updated Outcome' }];
      jest
        .spyOn(actionAreaOutcomeRepository, 'save')
        .mockResolvedValue(updateDto as any);

      expect(await service.update(updateDto)).toBe(updateDto);
    });
  });
});
