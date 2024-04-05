import { Test, TestingModule } from '@nestjs/testing';
import { OutcomeController } from './outcome.controller';
import { OutcomeService } from './outcome.service';

describe('OutcomeController', () => {
  let controller: OutcomeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutcomeController],
      providers: [OutcomeService],
    }).compile();

    controller = module.get<OutcomeController>(OutcomeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
