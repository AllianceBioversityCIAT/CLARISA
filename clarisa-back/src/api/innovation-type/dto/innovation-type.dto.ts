import { OmitType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV2 } from '../../../shared/entities/dtos/basic.v2.dto';

export class InnovationTypeDto extends OmitType(BasicDtoV2, ['description']) {
  @ApiProperty({
    description: 'The definition of the innovation type',
    type: String,
  })
  definition: string;
}
