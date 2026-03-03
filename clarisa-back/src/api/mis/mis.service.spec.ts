import { Test, TestingModule } from '@nestjs/testing';
import { MisService } from './mis.service';
import { MisRepository } from './repositories/mis.repository';
import { EnvironmentService } from '../environment/environment.service';
import { UserService } from '../user/user.service';
import { MisMapper } from './mappers/mis.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('MisService', () => {
  let service: MisService;

  const mockMisRepository: any = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    query: jest.fn(),
  };

  const mockEnvironmentService: any = {
    findOneByAcronym: jest.fn(),
  };

  const mockUserService: any = {
    findOne: jest.fn(),
  };

  const mockMisMapper: any = {
    classToSimpleDto: jest.fn().mockImplementation((x) => x || {}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MisService,
        { provide: MisRepository, useValue: mockMisRepository },
        { provide: EnvironmentService, useValue: mockEnvironmentService },
        { provide: UserService, useValue: mockUserService },
        { provide: MisMapper, useValue: mockMisMapper },
      ],
    }).compile();

    service = module.get<MisService>(MisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with SHOW_ALL', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    mockMisRepository.find.mockResolvedValue(mockItems);

    const result = await service.findAll(FindAllOptions.SHOW_ALL);
    expect(result).toEqual(mockItems);
  });

  it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
    const mockItems = [{ id: 1 }];
    mockMisRepository.find.mockResolvedValue(mockItems);

    const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toEqual(mockItems);
  });

  it('should throw on findAll with invalid option', async () => {
    await expect(service.findAll('invalid' as any)).rejects.toThrow();
  });

  it('should call repository on findOneByAcronymAndEnvironment', async () => {
    const mockItem = { id: 1 };
    mockMisRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOneByAcronymAndEnvironment('test', 'dev');
    expect(result).toBeDefined();
    expect(mockMisRepository.findOne).toHaveBeenCalled();
  });

  it('should return a single item on findOne', async () => {
    const mockItem = { id: 1 };
    mockMisRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });

  it('should call repository on findMetadataById', async () => {
    const mockItem = { id: 1 };
    mockMisRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findMetadataById(1);
    expect(result).toBeDefined();
    expect(mockMisRepository.findOne).toHaveBeenCalled();
  });

  it('should throw on create with missing data', async () => {
    await expect(
      service.create(null as any, { userId: 1 } as any),
    ).rejects.toThrow('Missing required data');
  });

  it('should throw on create with missing acronym', async () => {
    await expect(
      service.create({ name: 'Test' } as any, { userId: 1 } as any),
    ).rejects.toThrow('Missing MIS acronym');
  });
});
