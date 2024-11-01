import { ApiProperty } from '@nestjs/swagger';

export class WorkpackageCountryDto {
  @ApiProperty({
    description: 'The id of the workpackage country',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The iso alpha 2 code of the country',
    type: String,
  })
  iso_alpha_2: string;

  @ApiProperty({
    description: 'The name of the country',
    type: String,
  })
  name: string;
}
