import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './account.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { AccountDto } from './dto/account.dto';
import { OrmConfigTestModule } from '../../shared/config/ormconfig.test.module';
import { AccountTypeModule } from '../account-type/account-type.module';
import { AccountModule } from './account.module';

describe('AccountService', () => {
  let service: AccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [OrmConfigTestModule, AccountTypeModule, AccountModule],
      providers: [],
    }).compile();

    service = module.get<AccountService>(AccountService);
  }, 10000);

  describe('findAll', () => {
    it('should fail if the option parameter cannot be found on enum', () => {
      // Arrange
      const options: FindAllOptions = 999 as unknown as FindAllOptions;

      // Act
      const result = service.findAll(options);

      // Assert
      expect(result).rejects.toThrow('?!');
    });

    it('should return an array of AccountDto', async () => {
      // Arrange
      const options: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE;

      // Act
      const result: AccountDto[] = await service.findAll(options);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      if (result.length) {
        expect(result[0]).toBeInstanceOf(AccountDto);
        expect(result[0].code).toBeDefined();
        expect(result[0].code).toBe('1');
      }
    });
  });

  describe('findOne', () => {
    it('should return an AccountDto', async () => {
      // Arrange
      const id: number = 1;

      // Act
      const result: AccountDto = await service.findOne(id);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(AccountDto);
      expect(result.code).toBeDefined();
      expect(result.code).toBe(`${id}`);
    });
  });
});
