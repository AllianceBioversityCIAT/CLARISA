import { BasicDtoV1 } from '../../../shared/entities/dtos/basic.v1.dto';
import { ApiProperty, OmitType } from '@nestjs/swagger';

export class MisDto extends OmitType(BasicDtoV1, ['description'] as const) {
  @ApiProperty({
    description: 'The acronym of the MIS',
    type: String,
  })
  acronym: string;

  @ApiProperty({
    description: 'The id of the contact link of the MIS',
    minimum: 1,
    type: Number,
  })
  main_contact_point_id: number;

  @ApiProperty({
    description: 'The acronym of the environment',
    type: String,
  })
  environment: string;
}
