import { Test, TestingModule } from '@nestjs/testing';
import { BiParameterService } from './bi-parameter.service';
import { BiParameterRepository } from './repositories/bi-parameter.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('BiParameterService', () => {
  let service: BiParameterService;

  const mockBiParameterRepository: any = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    getFindAllInformation: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    query: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiParameterService,
        { provide: BiParameterRepository, useValue: mockBiParameterRepository },
      ],
    }).compile();

    service = module.get<BiParameterService>(BiParameterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    mockBiParameterRepository.find.mockResolvedValue(mockItems);

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toEqual(mockItems);
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    mockBiParameterRepository.find.mockResolvedValue(mockItems);

    const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toEqual(mockItems);
  });

  it('should throw on findAll with invalid option', async () => {
    await expect(service.findAll('invalid' as any)).rejects.toThrow();
  });

  it('should return a single item on findOne', async () => {
    const mockItem = { id: 1 };
    mockBiParameterRepository.findOneBy.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });

  it('should save items on update', async () => {
    const dto = [{ id: 1 }];
    mockBiParameterRepository.save.mockResolvedValue(dto);

    const result = await service.update(dto as any);
    expect(mockBiParameterRepository.save).toHaveBeenCalledWith(dto);
  });

  it('should call repository on findAllUnitParametersBi', async () => {
    const mockResult = { units: [], parameters: [] };
    mockBiParameterRepository.getFindAllInformation.mockResolvedValue(mockResult);

    const result = await service.findAllUnitParametersBi();
    expect(result).toEqual(mockResult);
    expect(mockBiParameterRepository.getFindAllInformation).toHaveBeenCalled();
  });
});
