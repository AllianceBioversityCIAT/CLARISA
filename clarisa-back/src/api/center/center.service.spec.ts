import { Test, TestingModule } from '@nestjs/testing';
import { CenterService } from './center.service';
import { CenterRepository } from './repositories/center.repository';
import { CgiarEntityTypeRepository } from '../cgiar-entity-type/repositories/cgiar-entity-type.repository';
import { CenterMapper } from './mappers/center.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('CenterService', () => {
  let service: CenterService;

  const mockCenterRepository: any = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    query: jest.fn(),
  };

  const mockCgiarEntityTypeRepository: any = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCenterMapper: any = {
    classListToDtoV1List: jest.fn().mockImplementation((x) => x || []),
    classToDtoV1: jest.fn().mockImplementation((x) => x || {}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CenterService,
        { provide: CenterRepository, useValue: mockCenterRepository },
        { provide: CgiarEntityTypeRepository, useValue: mockCgiarEntityTypeRepository },
        { provide: CenterMapper, useValue: mockCenterMapper },
      ],
    }).compile();

    service = module.get<CenterService>(CenterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAllV1 with SHOW_ALL', async () => {
    const mockType = { id: 1, name: 'center' };
    const mockItems = [{ id: 1 }, { id: 2 }];
    mockCgiarEntityTypeRepository.findOneBy.mockResolvedValue(mockType);
    mockCenterRepository.find.mockResolvedValue(mockItems);
    mockCenterMapper.classListToDtoV1List.mockReturnValue(mockItems);

    const result = await service.findAllV1(FindAllOptions.SHOW_ALL);
    expect(result).toBeDefined();
    expect(mockCenterRepository.find).toHaveBeenCalled();
  });

  it('should return active items on findAllV1 with SHOW_ONLY_ACTIVE', async () => {
    const mockType = { id: 1, name: 'center' };
    const mockItems = [{ id: 1 }];
    mockCgiarEntityTypeRepository.findOneBy.mockResolvedValue(mockType);
    mockCenterRepository.find.mockResolvedValue(mockItems);
    mockCenterMapper.classListToDtoV1List.mockReturnValue(mockItems);

    const result = await service.findAllV1(FindAllOptions.SHOW_ONLY_ACTIVE);
    expect(result).toBeDefined();
  });

  it('should throw on findAllV1 when type not found', async () => {
    mockCgiarEntityTypeRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findAllV1(FindAllOptions.SHOW_ALL)).rejects.toThrow(
      'Center type not found?!',
    );
  });

  it('should throw on findAllV1 with invalid option', async () => {
    const mockType = { id: 1, name: 'center' };
    mockCgiarEntityTypeRepository.findOneBy.mockResolvedValue(mockType);

    await expect(service.findAllV1('invalid' as any)).rejects.toThrow();
  });

  it('should return a single item on findOneV1', async () => {
    const mockType = { id: 1, name: 'center' };
    const mockItem = { id: 1 };
    mockCgiarEntityTypeRepository.findOneBy.mockResolvedValue(mockType);
    mockCenterRepository.findOneBy.mockResolvedValue(mockItem);
    mockCenterMapper.classToDtoV1.mockReturnValue(mockItem);

    const result = await service.findOneV1(1);
    expect(result).toBeDefined();
  });

  it('should return null on findOneV1 when not found', async () => {
    const mockType = { id: 1, name: 'center' };
    mockCgiarEntityTypeRepository.findOneBy.mockResolvedValue(mockType);
    mockCenterRepository.findOneBy.mockResolvedValue(null);

    const result = await service.findOneV1(999);
    expect(result).toBeNull();
  });
});
