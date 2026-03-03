import { Test, TestingModule } from '@nestjs/testing';
import { PartnerRequestService } from './partner-request.service';
import { PartnerRequestRepository } from './repositories/partner-request.repository';
import { InstitutionTypeRepository } from '../institution-type/repositories/institution-type.repository';
import { MisRepository } from '../mis/repositories/mis.repository';
import { CountryRepository } from '../country/repositories/country.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { OpenSearchInstitutionApi } from '../../integration/opensearch/institution/open-search-institution.api';

describe('PartnerRequestService', () => {
  let service: PartnerRequestService;

  const mockPartnerRequestRepository: any = {
    findAllPartnerRequests: jest.fn(),
    findPartnerRequestById: jest.fn(),
    createPartnerRequest: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    updatePartnerRequest: jest.fn(),
    respondPartnerRequest: jest.fn(),
    statisticsPartner: jest.fn(),
    createPartnerRequestBulk: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    query: jest.fn(),
  };

  const mockInstitutionTypeRepository: any = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
  };

  const mockMisRepository: any = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCountryRepository: any = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserRepository: any = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockOpenSearchInstitutionApi: any = {
    uploadSingleToOpenSearch: jest.fn(),
    uploadToOpenSearch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerRequestService,
        {
          provide: PartnerRequestRepository,
          useValue: mockPartnerRequestRepository,
        },
        {
          provide: InstitutionTypeRepository,
          useValue: mockInstitutionTypeRepository,
        },
        { provide: MisRepository, useValue: mockMisRepository },
        { provide: CountryRepository, useValue: mockCountryRepository },
        { provide: UserRepository, useValue: mockUserRepository },
        {
          provide: OpenSearchInstitutionApi,
          useValue: mockOpenSearchInstitutionApi,
        },
      ],
    }).compile();

    service = module.get<PartnerRequestService>(PartnerRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return items on findAll with defaults', async () => {
    const mockItems = [{ id: 1 }, { id: 2 }];
    mockPartnerRequestRepository.findAllPartnerRequests.mockResolvedValue(
      mockItems,
    );

    const result = await service.findAll();
    expect(result).toBeDefined();
    expect(
      mockPartnerRequestRepository.findAllPartnerRequests,
    ).toHaveBeenCalled();
  });

  it('should return items on findAll with explicit params', async () => {
    const mockItems = [{ id: 1 }];
    mockPartnerRequestRepository.findAllPartnerRequests.mockResolvedValue(
      mockItems,
    );

    const result = await service.findAll('pending', 'all');
    expect(result).toBeDefined();
  });

  it('should throw on findAll with invalid status', async () => {
    await expect(service.findAll('invalid_status')).rejects.toThrow();
  });

  it('should throw on findAll with invalid mis', async () => {
    await expect(service.findAll('pending', 'invalid_mis')).rejects.toThrow();
  });

  it('should return a single item on findOne', async () => {
    const mockItem = { id: 1 };
    mockPartnerRequestRepository.findPartnerRequestById.mockResolvedValue(
      mockItem,
    );

    const result = await service.findOne(1);
    expect(result).toBeDefined();
    expect(
      mockPartnerRequestRepository.findPartnerRequestById,
    ).toHaveBeenCalledWith(1);
  });

  it('should call statisticsPartner on statisticsPartnerRequest', async () => {
    mockPartnerRequestRepository.statisticsPartner.mockResolvedValue({});

    const result = await service.statisticsPartnerRequest();
    expect(result).toBeDefined();
    expect(mockPartnerRequestRepository.statisticsPartner).toHaveBeenCalled();
  });

  it('should throw on statisticsPartnerRequest with invalid mis', async () => {
    await expect(
      service.statisticsPartnerRequest('invalid_mis'),
    ).rejects.toThrow();
  });
});
