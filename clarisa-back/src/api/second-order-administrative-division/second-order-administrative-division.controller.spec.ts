import { Test, TestingModule } from '@nestjs/testing';
import { SecondOrderAdministrativeDivisionController } from './second-order-administrative-division.controller';
import { SecondOrderAdministrativeDivisionService } from './second-order-administrative-division.service';

describe('SecondOrderAdministrativeDivisionController', () => {
  let controller: SecondOrderAdministrativeDivisionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecondOrderAdministrativeDivisionController],
      providers: [SecondOrderAdministrativeDivisionService],
    }).compile();

    controller = module.get<SecondOrderAdministrativeDivisionController>(
      SecondOrderAdministrativeDivisionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
