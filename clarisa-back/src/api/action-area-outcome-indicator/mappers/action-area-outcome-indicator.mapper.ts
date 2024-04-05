import { Injectable } from '@nestjs/common';
import { ActionAreaOutcomeIndicator } from '../entities/action-area-outcome-indicator.entity';
import { ActionAreaOutcomeIndicatorV2Dto } from '../dto/action-area-outcome-indicator.v2.dto';
import { ActionAreaOutcomeMapper } from '../../action-area-outcome/mappers/action-area-outcome.mapper';
import { IndicatorMapper } from '../../indicator/mappers/indicator.mapper';

@Injectable()
export class ActionAreaOutcomeIndicatorMapper {
  constructor(
    private _actionAreaOutcomeMapper: ActionAreaOutcomeMapper,
    private _indicatorMapper: IndicatorMapper,
  ) {}

  classToDtoV2(
    actionAreaOutcomeIndicator: ActionAreaOutcomeIndicator,
  ): ActionAreaOutcomeIndicatorV2Dto {
    const actionAreaOutcomeIndicatorDto: ActionAreaOutcomeIndicatorV2Dto =
      new ActionAreaOutcomeIndicatorV2Dto();

    actionAreaOutcomeIndicatorDto.id = actionAreaOutcomeIndicator.id;
    if (actionAreaOutcomeIndicator.action_area_outcome_object) {
      actionAreaOutcomeIndicatorDto.actionAreaOutcome =
        this._actionAreaOutcomeMapper.classToDtoV2(
          actionAreaOutcomeIndicator.action_area_outcome_object,
        );
    }
    if (actionAreaOutcomeIndicator.indicator_object) {
      actionAreaOutcomeIndicatorDto.indicator =
        this._indicatorMapper.classToDto(
          actionAreaOutcomeIndicator.indicator_object,
        );
    }

    return actionAreaOutcomeIndicatorDto;
  }

  classListToDtoV2List(
    actionAreaOutcomeIndicators: ActionAreaOutcomeIndicator[],
  ): ActionAreaOutcomeIndicatorV2Dto[] {
    return actionAreaOutcomeIndicators.map((actionAreaOutcomeIndicator) =>
      this.classToDtoV2(actionAreaOutcomeIndicator),
    );
  }
}
