import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV2 } from '../../../shared/entities/dtos/basic.v2.dto';

export class CgiarEntityDtoV1 extends BasicDtoV2 {
  @ApiProperty({
    description: 'The acronym of the CGIAR entity',
    type: String,
  })
  acronym: string;

  @ApiProperty({
    description: 'The financial code of the CGIAR entity',
    type: String,
  })
  financial_code: string;

  @ApiProperty({
    description: 'The id of the institution linked to the CGIAR entity',
    minimum: 1,
    type: Number,
  })
  institutionId: number;

  @ApiProperty({
    description: 'The type of the CGIAR entity',
    type: BasicDtoV2,
  })
  cgiarEntityTypeDTO: BasicDtoV2;
}
