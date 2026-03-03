import { Test, TestingModule } from '@nestjs/testing';
import { FirstOrderAdministrativeDivisionService } from './first-order-administrative-division.service';
import { ApiGeoNames } from '../../integration/geonames/geonames.api';

describe('FirstOrderAdministrativeDivisionService', () => {
  let service: FirstOrderAdministrativeDivisionService;

  const mockApiGeoNames: any = {
    getFirstOrder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirstOrderAdministrativeDivisionService,
        { provide: ApiGeoNames, useValue: mockApiGeoNames },
      ],
    }).compile();

    service = module.get<FirstOrderAdministrativeDivisionService>(
      FirstOrderAdministrativeDivisionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have methods', () => {
    expect(service).toBeTruthy();
  });
});
