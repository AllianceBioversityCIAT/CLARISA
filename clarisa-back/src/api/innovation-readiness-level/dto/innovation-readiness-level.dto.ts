import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV1 } from '../../../shared/entities/dtos/basic.v1.dto';

export class InnovationReadinessLevelDto extends BasicDtoV1 {
  @ApiProperty({
    description: 'The level of the innovation readiness level',
    minimum: 0,
    type: Number,
  })
  level: number;
}
