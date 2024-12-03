import { Test, TestingModule } from '@nestjs/testing';
import { GlobalParameterController } from './global-parameter.controller';
import { GlobalParameterService } from './global-parameter.service';

describe('GlobalParameterController', () => {
  let controller: GlobalParameterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalParameterController],
      providers: [GlobalParameterService],
    }).compile();

    controller = module.get<GlobalParameterController>(
      GlobalParameterController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
