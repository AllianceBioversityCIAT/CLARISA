import { Injectable } from '@nestjs/common';
import { FindOptionsRelations } from 'typeorm';
import { ActionAreaOutcomeIndicator } from './entities/action-area-outcome-indicator.entity';
import { ActionAreaOutcomeIndicatorRepository } from './repositories/action-area-outcome-indicator.repository';
import { ActionAreaOutcomeIndicatorMapper } from './mappers/action-area-outcome-indicator.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ActionAreaOutcomeIndicatorV1Dto } from './dto/action-area-outcome-indicator.v1.dto';
import { ActionAreaOutcomeIndicatorV2Dto } from './dto/action-area-outcome-indicator.v2.dto';

@Injectable()
export class ActionAreaOutcomeIndicatorService {
  private readonly _relations: FindOptionsRelations<ActionAreaOutcomeIndicator> =
    {
      action_area_outcome_object: {
        action_area_object: true,
        outcome_object: true,
      },
      indicator_object: true,
    };

  constructor(
    private actionAreaOutcomeIndicatorRepository: ActionAreaOutcomeIndicatorRepository,
    private actionAreaOutcomeIndicatorMapper: ActionAreaOutcomeIndicatorMapper,
  ) {}

  async findAllV1(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ActionAreaOutcomeIndicatorV1Dto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this.actionAreaOutcomeIndicatorRepository.findAAOIS(option);
  }

  async findAllV2(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ActionAreaOutcomeIndicatorV2Dto[]> {
    let actionAreaOutcomeIndicators: ActionAreaOutcomeIndicator[] = [];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        actionAreaOutcomeIndicators =
          await this.actionAreaOutcomeIndicatorRepository.find({
            relations: this._relations,
          });
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        actionAreaOutcomeIndicators =
          await this.actionAreaOutcomeIndicatorRepository.find({
            relations: this._relations,
            where: {
              auditableFields: {
                is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
              },
            },
          });
        break;
      default:
        throw Error('?!');
    }

    return this.actionAreaOutcomeIndicatorMapper.classListToDtoV2List(
      actionAreaOutcomeIndicators,
    );
  }

  async findOneV1(id: number) {
    const result = await this.actionAreaOutcomeIndicatorRepository.findAAOIS(
      FindAllOptions.SHOW_ALL,
      id,
    );
    let actionAreaOutcomeIndicator: ActionAreaOutcomeIndicatorV1Dto;

    if (result.length === 1) {
      actionAreaOutcomeIndicator = result[0];
    } else {
      throw Error('?!');
    }

    return actionAreaOutcomeIndicator;
  }

  async findOneV2(id: number) {
    const actionAreaOutcomeIndicator =
      await this.actionAreaOutcomeIndicatorRepository.findOne({
        where: {
          id,
          auditableFields: { is_active: true },
        },
        relations: this._relations,
      });

    return this.actionAreaOutcomeIndicatorMapper.classToDtoV2(
      actionAreaOutcomeIndicator,
    );
  }
}
