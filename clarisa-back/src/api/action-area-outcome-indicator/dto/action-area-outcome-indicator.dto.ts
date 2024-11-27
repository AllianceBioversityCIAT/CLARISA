import { ApiProperty } from '@nestjs/swagger';

export class ActionAreaOutcomeIndicatorDto {
  @ApiProperty({
    type: Number,
    description: 'The id of the action area outcome indicator',
    minimum: 1,
  })
  actionAreaOutcomeIndicatorId: number;

  @ApiProperty({
    type: Number,
    description: 'The id of the action area',
    minimum: 1,
  })
  actionAreaId: number;

  @ApiProperty({
    type: String,
    description: 'The name of the action area',
  })
  actionAreaName: string;

  @ApiProperty({
    type: Number,
    description: 'The id of the action area outcome',
    minimum: 1,
  })
  outcomeId: number;

  @ApiProperty({
    type: String,
    description: 'The SMO code of the action area outcome',
  })
  outcomeSMOcode: string;

  @ApiProperty({
    type: String,
    description: 'The statement of the action area outcome',
  })
  outcomeStatement: string;

  @ApiProperty({
    type: Number,
    description: 'The id of the outcome indicator',
    minimum: 1,
  })
  outcomeIndicatorId: number;

  @ApiProperty({
    type: String,
    description: 'The SMO code of the outcome indicator',
  })
  outcomeIndicatorsSMOcode: string;

  @ApiProperty({
    type: String,
    description: 'The statement of the outcome indicator',
  })
  outcomeIndicatorStatement: string;
}
