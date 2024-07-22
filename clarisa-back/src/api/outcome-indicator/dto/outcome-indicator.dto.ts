import { ApiProperty } from '@nestjs/swagger';

export class OutcomeIndicatorDto {
  @ApiProperty({
    description: 'The id of the outcome indicator',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The SMO code of the outcome indicator',
    type: String,
  })
  smo_code: string;

  @ApiProperty({
    description: 'The statement of the outcome indicator',
    type: String,
  })
  outcome_indicator_statement: string;
}
