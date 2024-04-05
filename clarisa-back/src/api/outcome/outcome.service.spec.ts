import { Test, TestingModule } from '@nestjs/testing';
import { OutcomeService } from './outcome.service';

describe('OutcomeService', () => {
  let service: OutcomeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutcomeService],
    }).compile();

    service = module.get<OutcomeService>(OutcomeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
