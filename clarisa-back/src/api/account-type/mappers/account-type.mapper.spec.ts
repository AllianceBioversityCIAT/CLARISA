import { Test, TestingModule } from '@nestjs/testing';
import { AccountTypeMapper } from './account-type.mapper';
import { AccountType } from '../entities/account-type.entity';
import { AccountTypeDto } from '../dto/account-type.dto';

describe('AccountTypeMapper', () => {
  let mapper: AccountTypeMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountTypeMapper],
    }).compile();

    mapper = module.get<AccountTypeMapper>(AccountTypeMapper);
  });

  it('should be defined', () => {
    expect(mapper).toBeDefined();
  });

  describe('classToDto', () => {
    it('should map class to DTO', () => {
      const accountType: AccountType = {
        id: 1,
        name: 'Admin',
        acronym: '',
        composedName: '',
        accounts: [],
        auditableFields: null,
      };
      const accountTypeDto: AccountTypeDto = mapper.classToDto(accountType);

      expect(accountTypeDto.id).toEqual(accountType.id);
      expect(accountTypeDto.name).toEqual(accountType.name);
    });
  });

  describe('classListToDtoList', () => {
    it('should map class list to DTO list', () => {
      const accountTypes: AccountType[] = [
        {
          id: 1,
          name: 'Admin',
          acronym: '',
          composedName: '',
          accounts: [],
          auditableFields: null,
        },
        {
          id: 2,
          name: 'User',
          acronym: '',
          composedName: '',
          accounts: [],
          auditableFields: null,
        },
      ];
      const accountTypeDtos: AccountTypeDto[] =
        mapper.classListToDtoList(accountTypes);

      expect(accountTypeDtos[0].id).toEqual(accountTypes[0].id);
      expect(accountTypeDtos[0].name).toEqual(accountTypes[0].name);
      expect(accountTypeDtos[1].id).toEqual(accountTypes[1].id);
      expect(accountTypeDtos[1].name).toEqual(accountTypes[1].name);
    });
  });
});
