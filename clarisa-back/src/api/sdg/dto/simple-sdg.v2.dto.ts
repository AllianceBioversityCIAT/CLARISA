import { ApiProperty } from '@nestjs/swagger';

export class SimpleSdgV2Dto {
  @ApiProperty({
    description: 'The SMO code of the SDG',
    minimum: 1,
    type: Number,
  })
  smo_code: number;

  @ApiProperty({
    description: 'The financial code of the SDG',
    type: String,
  })
  financial_code: string;

  @ApiProperty({
    description: 'The short name of the SDG',
    type: String,
  })
  short_name: string;

  @ApiProperty({
    description: 'The full name of the SDG',
    type: String,
  })
  full_name: string;
}
