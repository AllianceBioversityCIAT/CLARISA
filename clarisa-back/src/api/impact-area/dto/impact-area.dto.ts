import { OmitType } from '@nestjs/mapped-types';
import { BasicDtoV1 } from '../../../shared/entities/dtos/basic.v1.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ImpactAreaDto extends OmitType(BasicDtoV1, [
  'is_active',
] as const) {
  @ApiProperty({
    description: 'The financial code of the impact area',
    type: String,
  })
  financialCode: string;

  @ApiProperty({
    description: 'The icon of the impact area',
    type: String,
  })
  icon: string;

  @ApiProperty({
    description: 'The color of the impact area',
    type: String,
  })
  color: string;
}
