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
  describe('updatePartnerRequest with an absent institution type', () => {
    // A PATCH from the admin panel only carries the type and the country when
    // the user re-opens their dropdowns. Both fields are optional by
    // inheritance, so an explicit null used to reach `findOneBy({ id: null })`,
    // which TypeORM answers with the first row of the table -- institution type
    // 3, "CGIAR Center". These tests fix the value the lookup is given.
    const storedRequest = () => ({
      id: 5873,
      institution_type_id: 78,
      country_id: 43,
      auditableFields: { is_active: true, updated_by_object: undefined },
    });

    const payload = (extra: any = {}) => ({
      id: 5873,
      name: 'Happy Smala',
      modification_justification: 'fixing the acronym',
      ...extra,
    });

    beforeEach(() => {
      mockUserRepository.findOneBy.mockResolvedValue({ id: 4372 });
      mockInstitutionTypeRepository.findOneBy.mockResolvedValue({ id: 78 });
      mockCountryRepository.findOneBy.mockResolvedValue({ id: 43 });
      mockPartnerRequestRepository.updatePartnerRequest.mockResolvedValue({});
    });

    it('keeps the type the request already has when the payload omits it', async () => {
      mockPartnerRequestRepository.findOneBy.mockResolvedValue(storedRequest());

      await service.updatePartnerRequest(
        payload() as any,
        {
          userId: 4372,
          email: 'someone@cgiar.org',
        } as any,
      );

      expect(mockInstitutionTypeRepository.findOneBy).toHaveBeenCalledWith({
        id: 78,
      });
      expect(mockInstitutionTypeRepository.findOneBy).not.toHaveBeenCalledWith({
        id: null,
      });
      expect(
        mockPartnerRequestRepository.updatePartnerRequest,
      ).toHaveBeenCalled();
    });

    it('keeps the type when the payload sends it as null', async () => {
      mockPartnerRequestRepository.findOneBy.mockResolvedValue(storedRequest());

      await service.updatePartnerRequest(
        payload({ institutionTypeCode: null }) as any,
        { userId: 4372, email: 'someone@cgiar.org' } as any,
      );

      expect(mockInstitutionTypeRepository.findOneBy).toHaveBeenCalledWith({
        id: 78,
      });
    });

    it('uses the incoming type when the payload does send one', async () => {
      mockPartnerRequestRepository.findOneBy.mockResolvedValue(storedRequest());
      mockInstitutionTypeRepository.findOneBy.mockResolvedValue({ id: 75 });

      await service.updatePartnerRequest(
        payload({ institutionTypeCode: 75 }) as any,
        { userId: 4372, email: 'someone@cgiar.org' } as any,
      );

      expect(mockInstitutionTypeRepository.findOneBy).toHaveBeenCalledWith({
        id: 75,
      });
    });

    it('keeps the country the request already has when the payload omits it', async () => {
      mockPartnerRequestRepository.findOneBy.mockResolvedValue(storedRequest());

      await service.updatePartnerRequest(
        payload() as any,
        {
          userId: 4372,
          email: 'someone@cgiar.org',
        } as any,
      );

      expect(mockCountryRepository.findOneBy).toHaveBeenCalledWith({ id: 43 });
    });

    it('uses the incoming country when the payload does send one', async () => {
      mockPartnerRequestRepository.findOneBy.mockResolvedValue(storedRequest());

      await service.updatePartnerRequest(
        payload({ hqCountryIso: 'MA' }) as any,
        { userId: 4372, email: 'someone@cgiar.org' } as any,
      );

      expect(mockCountryRepository.findOneBy).toHaveBeenCalledWith({
        iso_alpha_2: 'MA',
      });
    });

    it('still rejects a type code that does not exist', async () => {
      mockPartnerRequestRepository.findOneBy.mockResolvedValue(storedRequest());
      mockInstitutionTypeRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.updatePartnerRequest(
          payload({ institutionTypeCode: 99999 }) as any,
          { userId: 4372, email: 'someone@cgiar.org' } as any,
        ),
      ).rejects.toBeDefined();
      expect(
        mockPartnerRequestRepository.updatePartnerRequest,
      ).not.toHaveBeenCalled();
    });
  });
});
