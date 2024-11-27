import { ActionAreaOutcomeIndicatorDto } from '../../action-area-outcome-indicator/dto/action-area-outcome-indicator.dto';
import { ApiProperty, OmitType } from '@nestjs/swagger';

export class ActionAreaOutcomeDto extends OmitType(
  ActionAreaOutcomeIndicatorDto,
  ['actionAreaOutcomeIndicatorId', 'outcomeIndicatorsSMOcode'] as const,
) {
  @ApiProperty({
    type: Number,
    minimum: 1,
    description: 'The id of the action area outcome indicator',
  })
  id: number;

  @ApiProperty({
    type: String,
    description: 'The SMO code of the outcome indicator',
  })
  outcomeIndicatorSMOcode: string;
}
