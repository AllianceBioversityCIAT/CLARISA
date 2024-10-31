import { ApiProperty } from '@nestjs/swagger';

export class BaseInstitutionTypeDto {
  @ApiProperty({
    description: 'The id of the institution type',
    type: Number,
    minimum: 1,
  })
  code: number;

  @ApiProperty({
    description: 'The name of the institution type',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The parent of the institution type',
    type: () => BaseInstitutionTypeDto,
    nullable: true,
  })
  parent?: BaseInstitutionTypeDto;
}
