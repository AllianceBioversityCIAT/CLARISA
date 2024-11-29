import { Test, TestingModule } from '@nestjs/testing';
import { ActionAreaOutcomeIndicatorService } from './action-area-outcome-indicator.service';
import { ActionAreaOutcomeIndicatorRepository } from './repositories/action-area-outcome-indicator-repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
import { ActionAreaOutcomeIndicatorDto } from './dto/action-area-outcome-indicator.dto';

describe('ActionAreaOutcomeIndicatorService', () => {
  let service: ActionAreaOutcomeIndicatorService;
  let repository: ActionAreaOutcomeIndicatorRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionAreaOutcomeIndicatorService,
        {
          provide: ActionAreaOutcomeIndicatorRepository,
          useValue: {
            findActionAreaOutcomeIndicators: jest.fn(),
            findActionAreaOutcomeIndicatorById: jest.fn(),
            save: jest.fn(),
            target: { toString: () => 'ActionAreaOutcomeIndicator' },
          },
        },
      ],
    }).compile();

    service = module.get<ActionAreaOutcomeIndicatorService>(
      ActionAreaOutcomeIndicatorService,
    );
    repository = module.get<ActionAreaOutcomeIndicatorRepository>(
      ActionAreaOutcomeIndicatorRepository,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of ActionAreaOutcomeIndicatorDto', async () => {
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

      jest
        .spyOn(repository, 'findActionAreaOutcomeIndicators')
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
    it('should return an ActionAreaOutcomeIndicatorDto', async () => {
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

      jest
        .spyOn(repository, 'findActionAreaOutcomeIndicatorById')
        .mockResolvedValue(result);

      expect(await service.findOne(1)).toBe(result);
    });

    it('should throw ClarisaEntityNotFoundError if entity is not found', async () => {
      jest
        .spyOn(repository, 'findActionAreaOutcomeIndicatorById')
        .mockRejectedValue(new Error());

      await expect(service.findOne(1)).rejects.toThrow(
        ClarisaEntityNotFoundError.messageRegex,
      );
    });
  });

  describe('update', () => {
    it('should update and return the updated entities', async () => {
      const updateDto = [{ id: 1, name: 'Updated Test' }];
      jest.spyOn(repository, 'save').mockResolvedValue(updateDto as any);

      expect(await service.update(updateDto)).toBe(updateDto);
    });
  });
});
