import { Test, TestingModule } from '@nestjs/testing';
import { LeverController } from './lever.controller';
import { LeverService } from './lever.service';

describe('LeverController', () => {
  let controller: LeverController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeverController],
      providers: [LeverService],
    }).compile();

    controller = module.get<LeverController>(LeverController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
