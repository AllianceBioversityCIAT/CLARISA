import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV2 } from '../../../shared/entities/dtos/basic.v2.dto';

export class PortfolioDto extends BasicDtoV2 {
  @ApiProperty({
    description: 'The start date of the portfolio',
    type: Date,
  })
  start_date: number;

  @ApiProperty({
    description: 'The end date of the portfolio',
    type: Date,
  })
  end_date: number;
}
