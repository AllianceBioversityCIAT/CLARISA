import { Test, TestingModule } from '@nestjs/testing';
import { AccountTypeService } from './account-type.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { AccountTypeDto } from './dto/account-type.dto';
import { AccountTypeModule } from './account-type.module';
import { OrmConfigTestModule } from '../../shared/config/ormconfig.test.module';

describe('AccountTypeService', () => {
  let service: AccountTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountTypeModule, OrmConfigTestModule],
    }).compile();

    service = module.get<AccountTypeService>(AccountTypeService);
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

    it('should return an array of AccountTypeDto', async () => {
      // Arrange
      const findAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE;

      // Act
      const result = await service.findAll(findAllOptions);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      if (result.length) {
        expect(result[0]).toBeInstanceOf(AccountTypeDto);
        expect(result[0].id).toBeDefined();
        expect(result[0].id).toBe('1');
      }
    });
  });

  describe('findOne', () => {
    it('should return an AccountTypeDto', async () => {
      // Arrange
      const id = 1;

      // Act
      const result = await service.findOne(id);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(AccountTypeDto);
      expect(result.id).toBeDefined();
      expect(result.id).toBe(`${id}`);
    });
  });
});
