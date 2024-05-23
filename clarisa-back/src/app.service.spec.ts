import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import 'dotenv/config';
import { OrmConfigTestModule } from './shared/config/ormconfig.test.module';
import { UserRepository } from './api/user/repositories/user.repository';
import { User } from './api/user/entities/user.entity';

describe('Unit test bootstrap', () => {
  let module: TestingModule;
  let userRepository: UserRepository;
  beforeAll(async () => {
    (await import('dotenv')).config();
    module = await Test.createTestingModule({
      controllers: [],
      providers: [UserRepository],
      imports: [OrmConfigTestModule],
    }).compile();

    userRepository = module.get<UserRepository>(
      getRepositoryToken(UserRepository),
    );
  });

  it('should be connected to the database', async () => {
    const user: User = await userRepository.findOne({
      where: { auditableFields: { is_active: true } },
    });
    expect(user).toBeDefined();
  });

  afterAll(async () => {
    await module.close();
  });
});
