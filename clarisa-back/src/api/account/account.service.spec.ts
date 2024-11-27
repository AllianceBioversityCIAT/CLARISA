import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './account.service';
import { AccountRepository } from './repositories/account.repository';
import { AccountMapper } from './mappers/account.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
import { Account } from './entities/account.entity';
import { AccountDto } from './dto/account.dto';

describe('AccountService', () => {
  let service: AccountService;
  let repository: AccountRepository;
  let mapper: AccountMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: AccountRepository,
          useValue: {
            findAllAccounts: jest.fn(),
            findOneOrFail: jest.fn(),
            save: jest.fn(),
            target: { toString: () => 'Account' },
          },
        },
        {
          provide: AccountMapper,
          useValue: {
            classListToDtoList: jest.fn(),
            classToDto: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
    repository = module.get<AccountRepository>(AccountRepository);
    mapper = module.get<AccountMapper>(AccountMapper);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should throw BadParamsError if option is invalid', async () => {
      await expect(
        service.findAll('INVALID_OPTION' as FindAllOptions),
      ).rejects.toThrow(BadParamsError);
    });

    it('should return sorted account DTOs', async () => {
      const accounts: Account[] = [
        {
          id: 2,
          financial_code: 'code2',
          description: 'desc2',
          account_type_id: 2,
          parent_id: 2,
          account_type: null,
          parent: null,
          children: [],
          auditableFields: null,
        },
        {
          id: 1,
          financial_code: 'code1',
          description: 'desc1',
          account_type_id: 1,
          parent_id: 1,
          account_type: null,
          parent: null,
          children: [],
          auditableFields: null,
        },
      ];

      const accountDtos: AccountDto[] = [
        {
          code: 1,
          description: 'desc1',
          financialCode: 'code1',
          accountType: null,
          parent: null,
        },
        {
          code: 2,
          description: 'desc2',
          financialCode: 'code2',
          accountType: null,
          parent: null,
        },
      ];

      jest.spyOn(repository, 'findAllAccounts').mockResolvedValue(accounts);
      jest.spyOn(mapper, 'classListToDtoList').mockReturnValue(accountDtos);

      const result = await service.findAll();
      expect(result).toEqual(accountDtos);
    });
  });

  describe('findOne', () => {
    it('should return account DTO if found', async () => {
      const account: Account = {
        id: 2,
        financial_code: 'code2',
        description: 'desc2',
        account_type_id: 2,
        parent_id: 2,
        account_type: null,
        parent: null,
        children: [],
        auditableFields: null,
      };

      const accountDto: AccountDto = {
        code: 1,
        description: 'desc1',
        financialCode: 'code1',
        accountType: null,
        parent: null,
      };

      jest.spyOn(repository, 'findOneOrFail').mockResolvedValue(account);
      jest.spyOn(mapper, 'classToDto').mockReturnValue(accountDto);

      const result = await service.findOne(1);
      expect(result).toEqual(accountDto);
    });

    it('should throw ClarisaEntityNotFoundError if account not found', async () => {
      jest.spyOn(repository, 'findOneOrFail').mockRejectedValue(new Error());

      await expect(service.findOne(1)).rejects.toThrow(
        ClarisaEntityNotFoundError.messageRegex,
      );
    });
  });

  describe('update', () => {
    it('should save and return updated accounts', async () => {
      const updateDto = [{ id: 1 }];
      const savedAccounts = [{ id: 1 }];
      jest.spyOn(repository, 'save').mockResolvedValue(savedAccounts as any);

      const result = await service.update(updateDto);
      expect(result).toEqual(savedAccounts);
    });
  });
});
