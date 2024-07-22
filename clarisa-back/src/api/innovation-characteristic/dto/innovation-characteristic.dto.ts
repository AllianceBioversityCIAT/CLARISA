import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV1 } from '../../../shared/entities/dtos/basic.v1.dto';

export class InnovationCharacteristicDto extends BasicDtoV1 {
  @ApiProperty({
    description: 'The id of the source of the innovation characteristic',
    minimum: 1,
    type: Number,
  })
  source_id: number;
}
