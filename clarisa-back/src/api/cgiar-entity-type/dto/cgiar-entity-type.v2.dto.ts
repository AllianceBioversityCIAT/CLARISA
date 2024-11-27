import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV2 } from '../../../shared/entities/dtos/basic.v2.dto';

export class CgiarEntityTypeDtoV2 extends BasicDtoV2 {
  @ApiProperty({
    description: 'The prefix of the CGIAR entity',
    type: String,
  })
  prefix: string;

  @ApiProperty({
    description: 'The parent of the CGIAR entity',
    type: BasicDtoV2,
    nullable: true,
  })
  parent: BasicDtoV2;

  @ApiProperty({
    description: 'The definition of the CGIAR entity',
    type: String,
  })
  definition: string;

  @ApiProperty({
    description: 'The level of the CGIAR entity',
    minimum: 1,
    type: Number,
  })
  level: number;

  @ApiProperty({
    description: 'The funding source linked to the CGIAR entity',
    type: BasicDtoV2,
    nullable: true,
  })
  funding_source: BasicDtoV2;

  @ApiProperty({
    description: 'The acronym of the CGIAR entity',
    type: BasicDtoV2,
    nullable: true,
  })
  portfolio: BasicDtoV2;
}
