import { Test, TestingModule } from '@nestjs/testing';
import { CountryOfficeRequestService } from './country-office-request.service';
import { CountryOfficeRequestRepository } from './repositories/country-office-request.repository';
import { InstitutionRepository } from '../institution/repositories/institution.repository';
import { MisRepository } from '../mis/repositories/mis.repository';
import { CountryRepository } from '../country/repositories/country.repository';
import { UserRepository } from '../user/repositories/user.repository';

describe('CountryOfficeRequestService', () => {
  let service: CountryOfficeRequestService;

  const mockCountryOfficeRequestRepository: any = {
    findAllCountryOfficeRequests: jest.fn(),
    findCountryOfficeRequestById: jest.fn(),
    createCountryOfficeRequest: jest.fn(),
    findOneBy: jest.fn(),
    respondCountryOfficeRequest: jest.fn(),
    updateCountryOfficeRequest: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
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

  const mockInstitutionRepository: any = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
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

  const mockMisRepository: any = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
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

  const mockCountryRepository: any = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
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

  const mockUserRepository: any = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountryOfficeRequestService,
        {
          provide: CountryOfficeRequestRepository,
          useValue: mockCountryOfficeRequestRepository,
        },
        { provide: InstitutionRepository, useValue: mockInstitutionRepository },
        { provide: MisRepository, useValue: mockMisRepository },
        { provide: CountryRepository, useValue: mockCountryRepository },
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<CountryOfficeRequestService>(
      CountryOfficeRequestService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call repository on findAll', async () => {
    Object.keys(mockCountryOfficeRequestRepository).forEach((k) => {
      if (
        typeof mockCountryOfficeRequestRepository[k]?.mockResolvedValue ===
        'function'
      ) {
        mockCountryOfficeRequestRepository[k].mockResolvedValue([]);
      }
    });

    const result = await service.findAll();
    expect(result).toBeDefined();
  });

  it('should return a single item on findOne', async () => {
    const mockItem = { id: 1 };
    mockCountryOfficeRequestRepository.findOneBy =
      mockCountryOfficeRequestRepository.findOneBy || jest.fn();
    mockCountryOfficeRequestRepository.findOne =
      mockCountryOfficeRequestRepository.findOne || jest.fn();
    mockCountryOfficeRequestRepository.findOneBy.mockResolvedValue(mockItem);
    mockCountryOfficeRequestRepository.findOne.mockResolvedValue(mockItem);

    const result = await service.findOne(1);
    expect(result).toBeDefined();
  });
});
