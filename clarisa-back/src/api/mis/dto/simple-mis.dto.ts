import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV1 } from '../../../shared/entities/dtos/basic.v1.dto';

export class SimpleMisDto extends BasicDtoV1 {
  @ApiProperty({
    description: 'The acronym of the MIS',
    type: String,
  })
  acronym: string;

  @ApiProperty({
    description: 'The acronym of the environment',
    type: String,
  })
  environment: string;
}
