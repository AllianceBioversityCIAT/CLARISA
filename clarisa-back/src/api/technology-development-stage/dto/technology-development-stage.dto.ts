import { OmitType } from '@nestjs/mapped-types';
import { BasicDtoV1 } from '../../../shared/entities/dtos/basic.v1.dto';
import { ApiProperty } from '@nestjs/swagger';

export class TechnologyDevelopmentStageDto extends OmitType(BasicDtoV1, [
  'description',
] as const) {
  @ApiProperty({
    description: 'The official code of the technology development stage',
    type: String,
  })
  officialCode: string;
}
