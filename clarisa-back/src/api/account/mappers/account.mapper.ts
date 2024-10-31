import { Injectable } from '@nestjs/common/decorators/core/injectable.decorator';
import { AccountTypeMapper } from '../../account-type/mappers/account-type.mapper';
import { AccountDto } from '../dto/account.dto';
import { ParentAccountDto } from '../dto/parent-account.dto';
import { Account } from '../entities/account.entity';

@Injectable()
export class AccountMapper {
  constructor(private _accountTypeMapper: AccountTypeMapper) {}

  public classToDto(account: Account): AccountDto {
    const accountDto: AccountDto = new AccountDto();

    accountDto.code = account.id;
    accountDto.description = account.description;
    accountDto.financialCode = account.financial_code;

    accountDto.parent = account.parent
      ? this.parentAccountToDto(account.parent)
      : null;

    accountDto.accountType = account.account_type
      ? this._accountTypeMapper.classToDto(account.account_type)
      : null;

    return accountDto;
  }

  public parentAccountToDto(parentAccount: Account): ParentAccountDto {
    const parentAccountDto: ParentAccountDto = new ParentAccountDto();

    parentAccountDto.code = parentAccount.id;
    parentAccountDto.description = parentAccount.description;

    return parentAccountDto;
  }

  public classListToDtoList(accounts: Account[]): AccountDto[] {
    return accounts.map((a) => this.classToDto(a));
  }
}
