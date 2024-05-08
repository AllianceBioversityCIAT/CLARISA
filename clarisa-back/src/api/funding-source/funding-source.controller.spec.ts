import { Test, TestingModule } from '@nestjs/testing';
import { FundingSourceController } from './funding-source.controller';
import { FundingSourceService } from './funding-source.service';

describe('FundingSourceController', () => {
  let controller: FundingSourceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundingSourceController],
      providers: [FundingSourceService],
    }).compile();

    controller = module.get<FundingSourceController>(FundingSourceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
