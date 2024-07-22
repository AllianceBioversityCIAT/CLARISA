import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV2 } from '../../../shared/entities/dtos/basic.v2.dto';

export class FundingSourceDto extends BasicDtoV2 {
  @ApiProperty({
    description: 'The type of the funding source',
    type: String,
  })
  type_term: string;

  @ApiProperty({
    description: 'Where the funding goes to',
    type: String,
  })
  funding_to: string;
}
