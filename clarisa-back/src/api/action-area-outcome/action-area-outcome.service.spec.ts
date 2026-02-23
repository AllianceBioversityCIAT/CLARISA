import { Test, TestingModule } from '@nestjs/testing';
import { ActionAreaOutcomeService } from './action-area-outcome.service';
import { ActionAreaOutcomeRepository } from './repositories/action-area-outcome.repository';
import { ActionAreaOutcomeIndicatorRepository } from '../action-area-outcome-indicator/repositories/action-area-outcome-indicator-repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('ActionAreaOutcomeService', () => {
  let service: ActionAreaOutcomeService;

  const mockActionAreaOutcomeRepository: any = {
    findOneBy: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    query: jest.fn(),
  };

  const mockActionAreaOutcomeIndicatorRepository: any = {
    findAllActionAreaOutcomes: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    query: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionAreaOutcomeService,
        { provide: ActionAreaOutcomeRepository, useValue: mockActionAreaOutcomeRepository },
        { provide: ActionAreaOutcomeIndicatorRepository, useValue: mockActionAreaOutcomeIndicatorRepository },
      ],
    }).compile();

    service = module.get<ActionAreaOutcomeService>(ActionAreaOutcomeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    mockActionAreaOutcomeIndicatorRepository.findAllActionAreaOutcomes.mockResolvedValue(mockItems);

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
    expect(mockActionAreaOutcomeIndicatorRepository.findAllActionAreaOutcomes).toHaveBeenCalledWith(
      FindAllOptions.SHOW_ALL,
    );
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    mockActionAreaOutcomeIndicatorRepository.findAllActionAreaOutcomes.mockResolvedValue(mockItems);

    const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAll with invalid option', async () => {
    await expect(service.findAll('invalid' as any)).rejects.toThrow();
  });

  it('should return a single item on findOne', async () => {
    const mockItem = { id: 1 };
    mockActionAreaOutcomeRepository.findOneBy.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });

  it('should save items on update', async () => {
    const dto = [{ id: 1 }];
    mockActionAreaOutcomeRepository.save.mockResolvedValue(dto);

    const result = await service.update(dto as any);
    expect(mockActionAreaOutcomeRepository.save).toHaveBeenCalledWith(dto);
  });
});
