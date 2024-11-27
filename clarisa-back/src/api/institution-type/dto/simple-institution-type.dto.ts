import {
  ApiProperty,
  IntersectionType,
  OmitType,
  PickType,
} from '@nestjs/swagger';
import { InstitutionTypeDto } from './institution-type.dto';
import { BaseInstitutionTypeDto } from './base-institution-type.dto';

export class SimpleInstitutionTypeDto extends IntersectionType(
  OmitType(BaseInstitutionTypeDto, ['parent']),
  PickType(InstitutionTypeDto, ['description']),
) {
  @ApiProperty({
    description: 'The id of the parent of the institution type',
    type: String,
    nullable: true,
  })
  id_parent?: number;
}
