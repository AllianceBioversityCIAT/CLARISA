import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { AccountTypeDto } from './dto/account-type.dto';
import { UpdateAccountTypeDto } from './dto/update-account-type.dto';
import { AccountType } from './entities/account-type.entity';
import { AccountTypeMapper } from './mappers/account-type.mapper';
import { AccountTypeRepository } from './repositories/account-type.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class AccountTypeService {
  constructor(
    private _accountTypeRepository: AccountTypeRepository,
    private _accountTypeMapper: AccountTypeMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<AccountTypeDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._accountTypeRepository.target.toString(),
        'option',
        option,
      );
    }

    return this._accountTypeRepository
      .findAllAccountTypes(option)
      .then((accounts) => this._accountTypeMapper.classListToDtoList(accounts));
  }

  async findOne(id: number): Promise<AccountTypeDto> {
    return this._accountTypeRepository
      .findOneOrFail({
        where: {
          id,
          auditableFields: { is_active: true },
        },
      })
      .then((result) => this._accountTypeMapper.classToDto(result))
      .catch(() => {
        throw new ClarisaEntityNotFoundError(
          this._accountTypeRepository.target.toString(),
          id,
        );
      });
  }

  async update(
    updateUserDtoList: UpdateAccountTypeDto[],
  ): Promise<AccountType[]> {
    return await this._accountTypeRepository.save(updateUserDtoList);
  }
}
