import { ApiProperty } from '@nestjs/swagger';

export class SimpleCountryDto {
  @ApiProperty({
    description: 'The ISO code of the country',
    minimum: 1,
    type: Number,
  })
  code: number;

  @ApiProperty({
    description: 'The ISO Alpha-2 code of the country',
    type: String,
  })
  isoAlpha2: string;

  @ApiProperty({
    description: 'The ISO Alpha-2 code of the country',
    type: String,
  })
  isoAlpha3: string;

  @ApiProperty({
    description: 'The name of the country',
    type: String,
  })
  name: string;
}
