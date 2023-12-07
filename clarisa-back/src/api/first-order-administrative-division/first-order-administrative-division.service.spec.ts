import { Test, TestingModule } from '@nestjs/testing';
import { FirstOrderAdministrativeDivisionService } from './first-order-administrative-division.service';

describe('FirstOrderAdministrativeDivisionService', () => {
  let service: FirstOrderAdministrativeDivisionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FirstOrderAdministrativeDivisionService],
    }).compile();

    service = module.get<FirstOrderAdministrativeDivisionService>(
      FirstOrderAdministrativeDivisionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
