import { ApiProperty } from '@nestjs/swagger';

export class GeneralAcronymDto {
  @ApiProperty({
    description: 'The id of the acronym',
    type: Number,
    minimum: 1,
  })
  code: number;

  @ApiProperty({
    description: 'The acronym itself',
    type: String,
  })
  acronym: string;

  @ApiProperty({
    description: 'The description (definition) of the acronym',
    type: String,
  })
  description: string;
}
