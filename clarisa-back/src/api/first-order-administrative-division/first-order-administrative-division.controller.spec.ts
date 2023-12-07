import { Test, TestingModule } from '@nestjs/testing';
import { FirstOrderAdministrativeDivisionController } from './first-order-administrative-division.controller';
import { FirstOrderAdministrativeDivisionService } from './first-order-administrative-division.service';

describe('FirstOrderAdministrativeDivisionController', () => {
  let controller: FirstOrderAdministrativeDivisionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FirstOrderAdministrativeDivisionController],
      providers: [FirstOrderAdministrativeDivisionService],
    }).compile();

    controller = module.get<FirstOrderAdministrativeDivisionController>(
      FirstOrderAdministrativeDivisionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
