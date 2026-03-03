import { Test, TestingModule } from '@nestjs/testing';
import { PhaseService } from './phase.service';
import { PhaseRepository } from './repositories/phase.repository';
import { PhaseMapper } from './mappers/phase.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('PhaseService', () => {
  let service: PhaseService;

  const mockPhaseRepository: any = {
    findAllPhases: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    query: jest.fn(),
  };

  const mockPhaseMapper: any = {
    classToDto: jest.fn().mockImplementation((x) => x || {}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhaseService,
        { provide: PhaseRepository, useValue: mockPhaseRepository },
        { provide: PhaseMapper, useValue: mockPhaseMapper },
      ],
    }).compile();

    service = module.get<PhaseService>(PhaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with default args', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    mockPhaseRepository.findAllPhases.mockResolvedValue(mockItems);

    const result = await service.findAll();
    expect(result).toBeDefined();
    expect(mockPhaseRepository.findAllPhases).toHaveBeenCalled();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    mockPhaseRepository.findAllPhases.mockResolvedValue(mockItems);

    const result = await service.findAll(FindAllOptions.SHOW_ALL, 'all');
    expect(result).toBeDefined();
  });

  it('should throw on findAll with invalid status', async () => {
    await expect(
      service.findAll(FindAllOptions.SHOW_ALL, 'invalid_status'),
    ).rejects.toThrow();
  });

  it('should return items on findAllByApplication', async () => {
    const mockItems = [{ id: 1 }];
    mockPhaseRepository.findAllPhases.mockResolvedValue(mockItems);

    const result = await service.findAllByApplication('all');
    expect(result).toBeDefined();
  });

  it('should throw on findAllByApplication with invalid status', async () => {
    await expect(
      service.findAllByApplication('all', FindAllOptions.SHOW_ALL, 'invalid'),
    ).rejects.toThrow();
  });

  it('should throw on findAllByApplication with invalid application', async () => {
    await expect(
      service.findAllByApplication('INVALID_APP'),
    ).rejects.toThrow();
  });
});
