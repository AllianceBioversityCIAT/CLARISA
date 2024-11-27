import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV2 } from '../../../shared/entities/dtos/basic.v2.dto';

export class CgiarEntityDtoV2 extends BasicDtoV2 {
  @ApiProperty({
    description: 'The short name of the CGIAR entity',
    type: String,
  })
  short_name: string;

  @ApiProperty({
    description: 'The acronym of the CGIAR entity',
    type: String,
  })
  acronym: string;

  @ApiProperty({
    description: 'The type of the CGIAR entity',
    type: BasicDtoV2,
  })
  entity_type: BasicDtoV2;

  @ApiProperty({
    description: 'The parent of the CGIAR entity',
    type: BasicDtoV2,
    nullable: true,
  })
  parent: BasicDtoV2;

  @ApiProperty({
    description: 'The portfolio linked to the CGIAR entity',
    type: BasicDtoV2,
  })
  portfolio: BasicDtoV2;

  @ApiProperty({
    description: 'The start date of the CGIAR entity',
    type: String,
  })
  start_date: string;

  @ApiProperty({
    description: 'The end date of the CGIAR entity',
    type: String,
  })
  end_date: string;

  @ApiProperty({
    description: 'The level of the CGIAR entity',
    minimum: 1,
    type: Number,
  })
  level: number;
}
