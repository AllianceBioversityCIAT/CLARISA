import { Test, TestingModule } from '@nestjs/testing';
import { UserRolController } from './user-rol.controller';
import { UserRolService } from './user-rol.service';

describe('UserRolController', () => {
  let controller: UserRolController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRolController],
      providers: [UserRolService],
    }).compile();

    controller = module.get<UserRolController>(UserRolController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
