import { Test, TestingModule } from '@nestjs/testing';
import { ActionAreaService } from './action-area.service';
import { ActionAreaRepository } from './repositories/action-area.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
import { ActionArea } from './entities/action-area.entity';

describe('ActionAreaService', () => {
  let service: ActionAreaService;
  let repository: ActionAreaRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionAreaService,
        {
          provide: ActionAreaRepository,
          useValue: {
            find: jest.fn(),
            findOneByOrFail: jest.fn(),
            save: jest.fn(),
            target: { toString: () => 'ActionArea' },
          },
        },
      ],
    }).compile();

    service = module.get<ActionAreaService>(ActionAreaService);
    repository = module.get<ActionAreaRepository>(ActionAreaRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all action areas when option is SHOW_ALL', async () => {
      const result: ActionArea[] = [
        {
          id: 1,
          name: 'Action Area 1',
          description: 'desc1',
          icon: '',
          color: '',
          smo_code: '',
          action_area_outcome_indicators: [],
          initiative_stage_array: [],
          auditableFields: {
            is_active: true,
            created_at: undefined,
            updated_at: undefined,
            created_by: 0,
            updated_by: 0,
            modification_justification: '',
            created_by_object: undefined,
            updated_by_object: undefined,
          },
        },
        {
          id: 2,
          name: 'Action Area 2',
          description: 'desc2',
          icon: '',
          color: '',
          smo_code: '',
          action_area_outcome_indicators: [],
          initiative_stage_array: [],
          auditableFields: {
            is_active: false,
            created_at: undefined,
            updated_at: undefined,
            created_by: 0,
            updated_by: 0,
            modification_justification: '',
            created_by_object: undefined,
            updated_by_object: undefined,
          },
        },
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(result);

      expect(await service.findAll(FindAllOptions.SHOW_ALL)).toBe(result);
    });

    it('should return only active action areas when option is SHOW_ONLY_ACTIVE', async () => {
      const result: ActionArea[] = [
        {
          id: 1,
          name: 'Action Area 1',
          description: 'desc1',
          icon: '',
          color: '',
          smo_code: '',
          action_area_outcome_indicators: [],
          initiative_stage_array: [],
          auditableFields: null,
        },
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(result);

      expect(await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE)).toBe(
        result,
      );
    });

    it('should return only active action areas when option is null or non-present', async () => {
      const result: ActionArea[] = [
        {
          id: 1,
          name: 'Action Area 1',
          description: 'desc1',
          icon: '',
          color: '',
          smo_code: '',
          action_area_outcome_indicators: [],
          initiative_stage_array: [],
          auditableFields: null,
        },
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(result);

      expect(await service.findAll()).toBe(result);
    });

    it('should return only inactive action areas when option is SHOW_ONLY_INACTIVE', async () => {
      const result: ActionArea[] = [
        {
          id: 2,
          name: 'Action Area 2',
          description: 'desc2',
          icon: '',
          color: '',
          smo_code: '',
          action_area_outcome_indicators: [],
          initiative_stage_array: [],
          auditableFields: {
            is_active: false,
            created_at: undefined,
            updated_at: undefined,
            created_by: 0,
            updated_by: 0,
            modification_justification: '',
            created_by_object: undefined,
            updated_by_object: undefined,
          },
        },
      ];
      jest.spyOn(repository, 'find').mockResolvedValue(result);
      expect(await service.findAll(FindAllOptions.SHOW_ONLY_INACTIVE)).toBe(
        result,
      );
    });

    it('should throw BadParamsError for invalid option', async () => {
      await expect(service.findAll('INVALID_OPTION' as any)).rejects.toThrow(
        BadParamsError,
      );
    });
  });

  describe('findOne', () => {
    it('should return an action area by id', async () => {
      const result = { id: 1 };
      jest
        .spyOn(repository, 'findOneByOrFail')
        .mockResolvedValue(result as any);
      expect(await service.findOne(1)).toBe(result);
    });

    it('should throw ClarisaEntityNotFoundError if action area not found', async () => {
      jest.spyOn(repository, 'findOneByOrFail').mockRejectedValue(new Error());
      await expect(service.findOne(1)).rejects.toThrow(
        ClarisaEntityNotFoundError.messageRegex,
      );
    });
  });

  describe('update', () => {
    it('should update action areas', async () => {
      const updateDtoList = [{ id: 1 }];
      const result = [{ id: 1 }];
      jest.spyOn(repository, 'save').mockResolvedValue(result as any);
      expect(await service.update(updateDtoList as any)).toBe(result);
    });
  });
});
