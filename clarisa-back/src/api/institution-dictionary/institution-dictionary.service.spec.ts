import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionDictionaryService } from './institution-dictionary.service';
import { InstitutionRepository } from '../institution/repositories/institution.repository';
import { InstitutionDictionaryRepository } from './repositories/institution-dictionary.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('InstitutionDictionaryService', () => {
  let service: InstitutionDictionaryService;

  const mockInstitutionRepository: any = {
    findInstitutionSourceEntries: jest.fn(),
    findInstitutionSourceEntriesById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    query: jest.fn(),
  };

  const mockInstitutionDictionaryRepository: any = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    query: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionDictionaryService,
        { provide: InstitutionRepository, useValue: mockInstitutionRepository },
        {
          provide: InstitutionDictionaryRepository,
          useValue: mockInstitutionDictionaryRepository,
        },
      ],
    }).compile();

    service = module.get<InstitutionDictionaryService>(
      InstitutionDictionaryService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    mockInstitutionRepository.findInstitutionSourceEntries.mockResolvedValue(
      mockItems,
    );

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
    expect(
      mockInstitutionRepository.findInstitutionSourceEntries,
    ).toHaveBeenCalledWith(FindAllOptions.SHOW_ALL);
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    mockInstitutionRepository.findInstitutionSourceEntries.mockResolvedValue(
      mockItems,
    );

    const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAll with invalid option', async () => {
    await expect(service.findAll('invalid' as any)).rejects.toThrow();
  });

  it('should return a single item on findOne', async () => {
    const mockItem = { id: 1 };
    mockInstitutionRepository.findInstitutionSourceEntriesById.mockResolvedValue(
      mockItem,
    );

    const result = await service.findOne(1);
    expect(result).toBeDefined();
    expect(
      mockInstitutionRepository.findInstitutionSourceEntriesById,
    ).toHaveBeenCalledWith(1);
  });

  it('should save items on update', async () => {
    const dto = [{ id: 1 }];
    mockInstitutionDictionaryRepository.save.mockResolvedValue(dto);

    await service.update(dto as any);
    expect(mockInstitutionDictionaryRepository.save).toHaveBeenCalledWith(dto);
  });
});
