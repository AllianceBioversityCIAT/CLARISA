import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV2 } from '../../../shared/entities/dtos/basic.v2.dto';

export class EnvironmentDto extends BasicDtoV2 {
  @ApiProperty({
    description: 'The acronym of the environment',
    type: String,
  })
  acronym: string;
}
