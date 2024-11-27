import { Injectable } from '@nestjs/common';
import { AccountTypeDto } from '../dto/account-type.dto';
import { AccountType } from '../entities/account-type.entity';

@Injectable()
export class AccountTypeMapper {
  classToDto(accountType: AccountType): AccountTypeDto {
    const accountTypeDto: AccountTypeDto = new AccountTypeDto();

    accountTypeDto.id = accountType.id;
    accountTypeDto.name = accountType.name;

    return accountTypeDto;
  }

  classListToDtoList(accountTypes: AccountType[]): AccountTypeDto[] {
    return accountTypes.map((accountType) => this.classToDto(accountType));
  }
}
