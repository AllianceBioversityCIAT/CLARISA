import { Injectable } from '@nestjs/common';
import { ActionAreaOutcomeV2Dto } from '../dto/action-area-outcome.v2.dto';
import { ActionAreaOutcome } from '../entities/action-area-outcome.entity';
import { ActionAreaMapper } from '../../action-area/mappers/action-area.mapper';
import { OutcomeMapper } from '../../outcome/mappers/outcome.mapper';

@Injectable()
export class ActionAreaOutcomeMapper {
  constructor(
    private _actionAreaMapper: ActionAreaMapper,
    private _outcomeMapper: OutcomeMapper,
  ) {}
  classToDtoV2(actionAreaOutcome: ActionAreaOutcome): ActionAreaOutcomeV2Dto {
    const actionAreaOutcomeDto: ActionAreaOutcomeV2Dto =
      new ActionAreaOutcomeV2Dto();

    actionAreaOutcomeDto.id = actionAreaOutcome.id;
    if (actionAreaOutcome.action_area_object) {
      actionAreaOutcomeDto.actionArea = this._actionAreaMapper.classToDto(
        actionAreaOutcome.action_area_object,
      );
    }

    if (actionAreaOutcome.outcome_object) {
      actionAreaOutcomeDto.outcome = this._outcomeMapper.classToDto(
        actionAreaOutcome.outcome_object,
      );
    }

    return actionAreaOutcomeDto;
  }

  classListToDtoV2List(
    actionAreaOutcomes: ActionAreaOutcome[],
  ): ActionAreaOutcomeV2Dto[] {
    return actionAreaOutcomes.map((actionAreaOutcome) =>
      this.classToDtoV2(actionAreaOutcome),
    );
  }
}
