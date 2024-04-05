import { Test, TestingModule } from '@nestjs/testing';
import { ActionAreaOutcomeController } from './action-area-outcome.controller';
import { ActionAreaOutcomeService } from './action-area-outcome.service';

describe('ActionAreaOutcomeController', () => {
  let controller: ActionAreaOutcomeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionAreaOutcomeController],
      providers: [ActionAreaOutcomeService],
    }).compile();

    controller = module.get<ActionAreaOutcomeController>(ActionAreaOutcomeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
