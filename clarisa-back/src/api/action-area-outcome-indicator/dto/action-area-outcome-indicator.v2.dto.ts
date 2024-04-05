import { ActionAreaOutcomeV2Dto } from '../../action-area-outcome/dto/action-area-outcome.v2.dto';
import { IndicatorDto } from '../../indicator/dto/indicator.dto';

export class ActionAreaOutcomeIndicatorV2Dto {
  id: number;
  actionAreaOutcome: ActionAreaOutcomeV2Dto;
  indicator: IndicatorDto;
}
