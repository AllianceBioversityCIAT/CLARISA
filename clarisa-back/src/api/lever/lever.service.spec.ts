import { Test, TestingModule } from '@nestjs/testing';
import { LeverService } from './lever.service';

describe('LeverService', () => {
  let service: LeverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeverService],
    }).compile();

    service = module.get<LeverService>(LeverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
