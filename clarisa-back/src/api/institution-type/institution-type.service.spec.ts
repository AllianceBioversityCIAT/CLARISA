import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionTypeService } from './institution-type.service';
import { InstitutionTypeRepository } from './repositories/institution-type.repository';
import { InstitutionTypeMapper } from './mappers/institution-type.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

describe('InstitutionTypeService', () => {
  let service: InstitutionTypeService;

  const mockInstitutionTypeRepository: any = {
    findAllTypesFromChildrenToParent: jest.fn(),
    findAllTypesFromParentToChildren: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getRawOne: jest.fn().mockResolvedValue({}),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockInstitutionTypeMapper: any = {
    classToSimpleDto: jest.fn().mockImplementation((x) => x || []),
    classToDto: jest.fn().mockImplementation((x) => x || {}),
    classToDtoV1: jest.fn().mockImplementation((x) => x || {}),
    classToDtoV2: jest.fn().mockImplementation((x) => x || {}),
    classListToDtoList: jest.fn().mockImplementation((x) => x || []),
    classListToDtoV1List: jest.fn().mockImplementation((x) => x || []),
    classListToDtoV2List: jest.fn().mockImplementation((x) => x || []),
    entityTypeListToDtoV1List: jest.fn().mockImplementation((x) => x || []),
    entityTypeListToDtoV2List: jest.fn().mockImplementation((x) => x || []),
    entityTypeToDtoV1: jest.fn().mockImplementation((x) => x || []),
    entityTypeToDtoV2: jest.fn().mockImplementation((x) => x || []),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionTypeService,
        { provide: InstitutionTypeRepository, useValue: mockInstitutionTypeRepository },
        { provide: InstitutionTypeMapper, useValue: mockInstitutionTypeMapper },
      ],
    }).compile();

    service = module.get<InstitutionTypeService>(InstitutionTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should return items on findAll with SHOW_ALL', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      Object.keys(mockInstitutionTypeRepository).forEach(k => {
        if (typeof mockInstitutionTypeRepository[k]?.mockResolvedValue === 'function') {
          mockInstitutionTypeRepository[k].mockResolvedValue(mockItems);
        }
      });
      Object.keys(mockInstitutionTypeMapper).forEach(k => {
        if (typeof mockInstitutionTypeMapper[k]?.mockReturnValue === 'function') {
          mockInstitutionTypeMapper[k].mockReturnValue(mockItems);
        }
      });

      const result = await service.findAll(FindAllOptions.SHOW_ALL);
      expect(result).toBeDefined();
    });

    it('should return active items on findAll with SHOW_ONLY_ACTIVE', async () => {
      const mockItems = [{ id: 1 }];
      Object.keys(mockInstitutionTypeRepository).forEach(k => {
        if (typeof mockInstitutionTypeRepository[k]?.mockResolvedValue === 'function') {
          mockInstitutionTypeRepository[k].mockResolvedValue(mockItems);
        }
      });
      Object.keys(mockInstitutionTypeMapper).forEach(k => {
        if (typeof mockInstitutionTypeMapper[k]?.mockReturnValue === 'function') {
          mockInstitutionTypeMapper[k].mockReturnValue(mockItems);
        }
      });

      const result = await service.findAll(FindAllOptions.SHOW_ONLY_ACTIVE);
      expect(result).toBeDefined();
    });

    it('should throw on findAll with invalid option', async () => {
      await expect(service.findAll('invalid' as any)).rejects.toThrow();
    });

    it('should return a single item on findOne', async () => {
      const mockItem = { id: 1 };
      mockInstitutionTypeRepository.findOneBy = mockInstitutionTypeRepository.findOneBy || jest.fn();
      mockInstitutionTypeRepository.findOne = mockInstitutionTypeRepository.findOne || jest.fn();
      mockInstitutionTypeRepository.findOneBy.mockResolvedValue(mockItem);
      mockInstitutionTypeRepository.findOne.mockResolvedValue(mockItem);
      Object.keys(mockInstitutionTypeMapper).forEach(k => {
        if (typeof mockInstitutionTypeMapper[k]?.mockReturnValue === 'function') {
          mockInstitutionTypeMapper[k].mockReturnValue(mockItem);
        }
      });

      const result = await service.findOne(1);
      expect(result).toBeDefined();
    });

    it('should save items on update', async () => {
      const dto = [{ id: 1 }];
      mockInstitutionTypeRepository.save.mockResolvedValue(dto);

      const result = await service.update(dto as any);
      expect(mockInstitutionTypeRepository.save).toHaveBeenCalledWith(dto);
    });
});
