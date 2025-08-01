import { BasicDto } from '../../../shared/entities/dtos/basic-dto';

export class PortfolioDto extends BasicDto {
  start_date: number;
  end_date: number;

  @ApiProperty({
    description: 'The acronym of the portfolio',
    type: String,
    required: false,
  })
  acronym?: string;
}
