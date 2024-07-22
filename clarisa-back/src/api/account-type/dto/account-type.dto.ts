import { ApiProperty } from '@nestjs/swagger';

export class AccountTypeDto {
  @ApiProperty({
    description: 'The id of the account type',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The name of the account type',
    type: String,
  })
  name: string;
}
