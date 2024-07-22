import { ApiProperty } from '@nestjs/swagger';
import { AccountTypeDto } from '../../account-type/dto/account-type.dto';
import { ParentAccountDto } from './parent-account.dto';

export class AccountDto {
  @ApiProperty({
    description: 'The id of the account',
    minimum: 1,
    type: Number,
  })
  code: number;

  @ApiProperty({
    description: 'The name of the account',
    type: String,
  })
  description: string;

  @ApiProperty({
    description: 'The financial code of the account',
    type: String,
  })
  financialCode: string;

  @ApiProperty({
    description: 'The account type of the account',
    type: AccountTypeDto,
  })
  accountType: AccountTypeDto;

  @ApiProperty({
    description: 'The parent account of the account',
    type: ParentAccountDto,
  })
  parent: ParentAccountDto;
}
