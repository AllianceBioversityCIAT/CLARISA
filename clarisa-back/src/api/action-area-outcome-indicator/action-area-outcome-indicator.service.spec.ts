import { Test, TestingModule } from '@nestjs/testing';
import { ActionAreaOutcomeIndicatorService } from './action-area-outcome-indicator.service';

describe('ActionAreaOutcomeIndicatorService', () => {
  let service: ActionAreaOutcomeIndicatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActionAreaOutcomeIndicatorService],
    }).compile();

    service = module.get<ActionAreaOutcomeIndicatorService>(ActionAreaOutcomeIndicatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
