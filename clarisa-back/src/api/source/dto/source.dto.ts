import { ApiProperty, OmitType } from '@nestjs/swagger';
import { BasicDtoV1 } from '../../../shared/entities/dtos/basic.v1.dto';

export class SourceDto extends OmitType(BasicDtoV1, ['description'] as const) {
  @ApiProperty({
    description: 'The acronym of the source',
    type: String,
  })
  acronym: string;

  @ApiProperty({
    description: 'The contact point id for the source',
    type: Number,
  })
  contact_point_id: number;
}
