import { ApiProperty } from '@nestjs/swagger';

export class InstitutionSourceDto {
  @ApiProperty({
    description: 'The source of the institution',
    type: String,
  })
  source: string;

  @ApiProperty({
    description: 'The name of the institution in the source',
    type: String,
  })
  institutionName: string;

  @ApiProperty({
    description: 'The code of the institution in the source',
    type: String,
  })
  institutionCode: string;
}
