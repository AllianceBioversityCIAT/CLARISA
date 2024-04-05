import { ActionAreaDto } from '../../action-area/dto/action-area.dto';
import { OutcomeDto } from '../../outcome/dto/outcome.dto';

export class ActionAreaOutcomeV2Dto {
  id: number;
  outcome: OutcomeDto;
  actionArea: ActionAreaDto;
}
