import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV2 } from '../../../shared/entities/dtos/basic.v2.dto';

export class ScienceGroupDto extends BasicDtoV2 {
  @ApiProperty({
    description: 'The financial code of the science group',
    type: String,
  })
  financialCode: string;

  @ApiProperty({
    description: 'The parent science group',
    type: BasicDtoV2,
  })
  parent: BasicDtoV2;
}
