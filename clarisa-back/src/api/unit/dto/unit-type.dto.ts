import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV2 } from '../../../shared/entities/dtos/basic.v2.dto';

export class UnitTypeDto extends BasicDtoV2 {
  @ApiProperty({
    description: 'The acronym of the unit type',
    type: String,
  })
  acronym: string;
}
