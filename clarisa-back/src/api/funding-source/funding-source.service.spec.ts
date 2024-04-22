import { Test, TestingModule } from '@nestjs/testing';
import { FundingSourceService } from './funding-source.service';

describe('FundingSourceService', () => {
  let service: FundingSourceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FundingSourceService],
    }).compile();

    service = module.get<FundingSourceService>(FundingSourceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
