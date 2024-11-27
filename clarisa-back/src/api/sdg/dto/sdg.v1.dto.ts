import { ApiProperty } from '@nestjs/swagger';

export class SdgV1Dto {
  @ApiProperty({
    description: 'The code of the SDG',
    minimum: 1,
    type: Number,
  })
  usndCode: number;

  @ApiProperty({
    description: 'The short name of the SDG',
    type: String,
  })
  shortName: string;

  @ApiProperty({
    description: 'The full name of the SDG',
    type: String,
  })
  fullName: string;

  @ApiProperty({
    description: 'The financial code of the SDG',
    type: String,
  })
  financialCode: string;
}
