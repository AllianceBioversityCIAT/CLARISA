import { Test, TestingModule } from '@nestjs/testing';
import { ActionAreaOutcomeIndicatorController } from './action-area-outcome-indicator.controller';
import { ActionAreaOutcomeIndicatorService } from './action-area-outcome-indicator.service';

describe('ActionAreaOutcomeIndicatorController', () => {
  let controller: ActionAreaOutcomeIndicatorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionAreaOutcomeIndicatorController],
      providers: [ActionAreaOutcomeIndicatorService],
    }).compile();

    controller = module.get<ActionAreaOutcomeIndicatorController>(ActionAreaOutcomeIndicatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
