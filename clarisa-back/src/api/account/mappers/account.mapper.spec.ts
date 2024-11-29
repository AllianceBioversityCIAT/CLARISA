import { AccountMapper } from './account.mapper';
import { AccountTypeMapper } from '../../account-type/mappers/account-type.mapper';
import { AccountDto } from '../dto/account.dto';
import { ParentAccountDto } from '../dto/parent-account.dto';
import { Account } from '../entities/account.entity';

describe('AccountMapper', () => {
  let accountMapper: AccountMapper;
  let accountTypeMapper: AccountTypeMapper;

  beforeEach(() => {
    accountTypeMapper = new AccountTypeMapper();
    accountMapper = new AccountMapper(accountTypeMapper);
  });

  describe('classToDto', () => {
    it('should map Account to AccountDto', () => {
      const account: Account = {
        id: 1,
        description: 'Test Account',
        financial_code: '12345',
        parent: {
          id: 2,
          description: 'Parent Account',
          financial_code: null,
          account_type_id: 0,
          parent_id: 0,
          account_type: null,
          parent: null,
          children: [],
          auditableFields: null,
        },
        account_type: {
          id: 3,
          name: 'Type 1',
          acronym: '',
          composedName: '',
          accounts: [],
          auditableFields: null,
        },
        account_type_id: 3,
        parent_id: 2,
        children: [],
        auditableFields: null,
      };

      const accountDto: AccountDto = accountMapper.classToDto(account);

      expect(accountDto.code).toBe(account.id);
      expect(accountDto.description).toBe(account.description);
      expect(accountDto.financialCode).toBe(account.financial_code);
      expect(accountDto.parent.code).toBe(account.parent.id);
      expect(accountDto.parent.description).toBe(account.parent.description);
      expect(accountDto.accountType.id).toBe(account.account_type.id);
      expect(accountDto.accountType.name).toBe(account.account_type.name);
    });

    it('should map Account to AccountDto without parent', () => {
      const account: Account = {
        id: 1,
        description: 'Test Account',
        financial_code: '12345',
        parent: null,
        account_type: {
          id: 3,
          name: 'Type 1',
          acronym: '',
          composedName: '',
          accounts: [],
          auditableFields: null,
        },
        account_type_id: 3,
        parent_id: 0,
        children: [],
        auditableFields: null,
      };

      const accountDto: AccountDto = accountMapper.classToDto(account);

      expect(accountDto.code).toBe(account.id);
      expect(accountDto.description).toBe(account.description);
      expect(accountDto.financialCode).toBe(account.financial_code);
      expect(accountDto.parent).toBeNull();
      expect(accountDto.accountType.id).toBe(account.account_type.id);
      expect(accountDto.accountType.name).toBe(account.account_type.name);
    });

    it('should map Account to AccountDto without account type', () => {
      const account: Account = {
        id: 1,
        description: 'Test Account',
        financial_code: '12345',
        parent: {
          id: 2,
          description: 'Parent Account',
          financial_code: null,
          account_type_id: 0,
          parent_id: 0,
          account_type: null,
          parent: null,
          children: [],
          auditableFields: null,
        },
        account_type: null,
        account_type_id: 0,
        parent_id: 2,
        children: [],
        auditableFields: null,
      };

      const accountDto: AccountDto = accountMapper.classToDto(account);

      expect(accountDto.code).toBe(account.id);
      expect(accountDto.description).toBe(account.description);
      expect(accountDto.financialCode).toBe(account.financial_code);
      expect(accountDto.parent.code).toBe(account.parent.id);
      expect(accountDto.parent.description).toBe(account.parent.description);
      expect(accountDto.accountType).toBeNull();
    });
  });

  describe('parentAccountToDto', () => {
    it('should map parent Account to ParentAccountDto', () => {
      const parentAccount: Account = {
        id: 2,
        description: 'Parent Account',
        financial_code: '',
        account_type_id: 0,
        parent_id: 0,
        account_type: null,
        parent: null,
        children: [],
        auditableFields: null,
      };

      const parentAccountDto: ParentAccountDto =
        accountMapper.parentAccountToDto(parentAccount);

      expect(parentAccountDto.code).toBe(parentAccount.id);
      expect(parentAccountDto.description).toBe(parentAccount.description);
    });
  });

  describe('classListToDtoList', () => {
    it('should map list of Accounts to list of AccountDtos', () => {
      const accounts: Account[] = [
        {
          id: 1,
          description: 'Test Account 1',
          financial_code: '12345',
          parent: {
            id: 2,
            description: 'Parent Account 1',
            financial_code: '',
            account_type_id: 0,
            parent_id: 0,
            account_type: null,
            parent: null,
            children: [],
            auditableFields: null,
          },
          account_type: {
            id: 3,
            name: 'Type 1',
            acronym: '',
            composedName: '',
            accounts: [],
            auditableFields: null,
          },
          account_type_id: 0,
          parent_id: 0,
          children: [],
          auditableFields: null,
        },
        {
          id: 2,
          description: 'Test Account 2',
          financial_code: '54321',
          parent: {
            id: 3,
            description: 'Parent Account 2',
            financial_code: '',
            account_type_id: 0,
            parent_id: 0,
            account_type: null,
            parent: null,
            children: [],
            auditableFields: null,
          },
          account_type: {
            id: 4,
            name: 'Type 2',
            acronym: '',
            composedName: '',
            accounts: [],
            auditableFields: null,
          },
          account_type_id: 0,
          parent_id: 0,
          children: [],
          auditableFields: null,
        },
      ];

      const accountDtos: AccountDto[] =
        accountMapper.classListToDtoList(accounts);

      expect(accountDtos.length).toBe(2);
      expect(accountDtos[0].code).toBe(accounts[0].id);
      expect(accountDtos[0].description).toBe(accounts[0].description);
      expect(accountDtos[0].financialCode).toBe(accounts[0].financial_code);
      expect(accountDtos[0].parent.code).toBe(accounts[0].parent.id);
      expect(accountDtos[0].parent.description).toBe(
        accounts[0].parent.description,
      );
      expect(accountDtos[0].accountType.id).toBe(accounts[0].account_type.id);
      expect(accountDtos[0].accountType.name).toBe(
        accounts[0].account_type.name,
      );

      expect(accountDtos[1].code).toBe(accounts[1].id);
      expect(accountDtos[1].description).toBe(accounts[1].description);
      expect(accountDtos[1].financialCode).toBe(accounts[1].financial_code);
      expect(accountDtos[1].parent.code).toBe(accounts[1].parent.id);
      expect(accountDtos[1].parent.description).toBe(
        accounts[1].parent.description,
      );
      expect(accountDtos[1].accountType.id).toBe(accounts[1].account_type.id);
      expect(accountDtos[1].accountType.name).toBe(
        accounts[1].account_type.name,
      );
    });
  });
});
