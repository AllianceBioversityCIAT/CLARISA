import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { AccountDto } from './dto/account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountMapper } from './mappers/account.mapper';
import { AccountRepository } from './repositories/account.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class AccountService {
  constructor(
    private _accountRepository: AccountRepository,
    private _accountMapper: AccountMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<AccountDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._accountRepository.target.toString(),
        'option',
        option,
      );
    }

    return this._accountRepository
      .findAllAccounts(option)
      .then((accounts) =>
        this._accountMapper
          .classListToDtoList(accounts)
          .sort((a, b) => a.code - b.code),
      );
  }

  async findOne(id: number): Promise<AccountDto> {
    return this._accountRepository
      .findOneOrFail({
        where: {
          id,
          auditableFields: { is_active: true },
        },
        relations: {
          parent: true,
          account_type: true,
        },
      })
      .then((account) => this._accountMapper.classToDto(account))
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._accountRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateInitiativeDto: UpdateAccountDto[]) {
    return await this._accountRepository.save(updateInitiativeDto);
  }
}
