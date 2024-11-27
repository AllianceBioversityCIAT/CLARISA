import { Test, TestingModule } from '@nestjs/testing';
import { AccountTypeService } from './account-type.service';
import { AccountTypeRepository } from './repositories/account-type.repository';
import { AccountTypeMapper } from './mappers/account-type.mapper';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
import { AccountType } from './entities/account-type.entity';
import { AccountTypeDto } from './dto/account-type.dto';

describe('AccountTypeService', () => {
  let service: AccountTypeService;
  let repository: AccountTypeRepository;
  let mapper: AccountTypeMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountTypeService,
        {
          provide: AccountTypeRepository,
          useValue: {
            findAllAccountTypes: jest.fn(),
            findOneOrFail: jest.fn(),
            save: jest.fn(),
            target: { toString: () => 'AccountType' },
          },
        },
        {
          provide: AccountTypeMapper,
          useValue: {
            classListToDtoList: jest.fn(),
            classToDto: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AccountTypeService>(AccountTypeService);
    repository = module.get<AccountTypeRepository>(AccountTypeRepository);
    mapper = module.get<AccountTypeMapper>(AccountTypeMapper);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of AccountTypeDto', async () => {
      const accountTypes: AccountType[] = [
        {
          id: 1,
          name: 'Account Type 1',
          acronym: 'AT1',
          composedName: 'Account Type 1 (AT1)',
          accounts: [],
          auditableFields: null,
        },
        {
          id: 2,
          name: 'Account Type 2',
          acronym: 'AT2',
          composedName: 'Account Type 2 (AT2)',
          accounts: [],
          auditableFields: null,
        },
      ];

      const accountTypeDtos: AccountTypeDto[] = [
        {
          id: 1,
          name: 'Account Type 1',
        },
        {
          id: 2,
          name: 'Account Type 2',
        },
      ];

      jest
        .spyOn(repository, 'findAllAccountTypes')
        .mockResolvedValue(accountTypes);
      jest.spyOn(mapper, 'classListToDtoList').mockReturnValue(accountTypeDtos);

      expect(await service.findAll()).toEqual(accountTypeDtos);
    });

    it('should throw BadParamsError if option is invalid', async () => {
      await expect(service.findAll('INVALID_OPTION' as any)).rejects.toThrow(
        BadParamsError,
      );
    });
  });

  describe('findOne', () => {
    it('should return an AccountTypeDto', async () => {
      const accountType: AccountType = {
        id: 1,
        name: 'Account Type 1',
        acronym: 'AT1',
        composedName: 'Account Type 1 (AT1)',
        accounts: [],
        auditableFields: null,
      };

      const accountTypeDto: AccountTypeDto = {
        id: 1,
        name: 'Account Type 1',
      };

      jest.spyOn(repository, 'findOneOrFail').mockResolvedValue(accountType);
      jest.spyOn(mapper, 'classToDto').mockReturnValue(accountTypeDto);

      expect(await service.findOne(1)).toEqual(accountTypeDto);
    });

    it('should throw ClarisaEntityNotFoundError if account type not found', async () => {
      jest.spyOn(repository, 'findOneOrFail').mockRejectedValue(new Error());

      await expect(service.findOne(1)).rejects.toThrow(
        ClarisaEntityNotFoundError.messageRegex,
      );
    });
  });

  describe('update', () => {
    it('should update and return the account types', async () => {
      const updateAccountTypeDtoList = [{ id: 1, name: 'Updated' }];
      const updatedAccountTypes = [{ id: 1, name: 'Updated' }];
      jest
        .spyOn(repository, 'save')
        .mockResolvedValue(updatedAccountTypes as any);

      expect(await service.update(updateAccountTypeDtoList)).toEqual(
        updatedAccountTypes,
      );
    });
  });
});
