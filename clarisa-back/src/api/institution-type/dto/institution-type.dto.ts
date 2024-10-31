import { ApiProperty } from '@nestjs/swagger';
import { BaseInstitutionTypeDto } from './base-institution-type.dto';

export class InstitutionTypeDto extends BaseInstitutionTypeDto {
  @ApiProperty({
    description: 'The description of the institution type',
    type: String,
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    description: 'Is this institution type legacy?',
    type: Boolean,
    nullable: true,
  })
  legacy?: boolean;
}
