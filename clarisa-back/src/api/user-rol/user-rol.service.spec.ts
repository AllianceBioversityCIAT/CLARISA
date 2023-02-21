import { Test, TestingModule } from '@nestjs/testing';
import { UserRolService } from './user-rol.service';

describe('UserRolService', () => {
  let service: UserRolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRolService],
    }).compile();

    service = module.get<UserRolService>(UserRolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
