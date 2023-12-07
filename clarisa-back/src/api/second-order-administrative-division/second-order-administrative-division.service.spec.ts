import { Test, TestingModule } from '@nestjs/testing';
import { SecondOrderAdministrativeDivisionService } from './second-order-administrative-division.service';

describe('SecondOrderAdministrativeDivisionService', () => {
  let service: SecondOrderAdministrativeDivisionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecondOrderAdministrativeDivisionService],
    }).compile();

    service = module.get<SecondOrderAdministrativeDivisionService>(
      SecondOrderAdministrativeDivisionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
