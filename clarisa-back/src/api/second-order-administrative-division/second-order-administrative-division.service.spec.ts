import { Test, TestingModule } from '@nestjs/testing';
import { SecondOrderAdministrativeDivisionService } from './second-order-administrative-division.service';
import { ApiGeoNames } from '../../integration/geonames/geonames.api';

describe('SecondOrderAdministrativeDivisionService', () => {
  let service: SecondOrderAdministrativeDivisionService;

  const mockApiGeoNames: any = {
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecondOrderAdministrativeDivisionService,
        { provide: ApiGeoNames, useValue: mockApiGeoNames },
      ],
    }).compile();

    service = module.get<SecondOrderAdministrativeDivisionService>(SecondOrderAdministrativeDivisionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should have methods', () => {
      expect(service).toBeTruthy();
    });
});
