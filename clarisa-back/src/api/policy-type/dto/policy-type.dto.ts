import { OmitType } from '@nestjs/mapped-types';
import { BasicDtoV1 } from '../../../shared/entities/dtos/basic.v1.dto';
import { ApiProperty } from '@nestjs/swagger';

export class PolicyTypeDto extends OmitType(BasicDtoV1, [
  'description',
] as const) {
  @ApiProperty({
    description: 'The definition of the policy type',
    type: String,
  })
  definition: string;

  @ApiProperty({
    description: 'The id of the source',
    minimum: 1,
    type: Number,
  })
  source_id: number;
}
