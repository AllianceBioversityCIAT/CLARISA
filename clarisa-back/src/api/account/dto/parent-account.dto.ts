import { ApiProperty } from '@nestjs/swagger';

export class ParentAccountDto {
  @ApiProperty({
    description: 'The id of the parent account',
    minimum: 1,
    type: Number,
  })
  code: number;

  @ApiProperty({
    description: 'The name of the parent account',
    type: String,
  })
  description: string;
}
