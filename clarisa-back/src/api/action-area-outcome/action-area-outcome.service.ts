import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ActionAreaOutcomeRepository } from './repositories/action-area-outcome.repository';
import { ActionAreaOutcomeMapper } from './mappers/action-area-outcome.mapper';
import { ActionAreaOutcomeV2Dto } from './dto/action-area-outcome.v2.dto';
import { ActionAreaOutcome } from './entities/action-area-outcome.entity';
import { FindOptionsRelations } from 'typeorm';
import { ActionAreaOutcomeIndicatorRepository } from '../action-area-outcome-indicator/repositories/action-area-outcome-indicator.repository';
import { ActionAreaOutcomeIndicatorV1Dto } from '../action-area-outcome-indicator/dto/action-area-outcome-indicator.v1.dto';

@Injectable()
export class ActionAreaOutcomeService {
  private readonly _relations: FindOptionsRelations<ActionAreaOutcome> = {
    action_area_object: true,
    outcome_object: true,
  };

  constructor(
    private actionAreaOutcomeRepository: ActionAreaOutcomeRepository,
    private actionAreaOutcomeIndicatorRepository: ActionAreaOutcomeIndicatorRepository,
    private actionAreaOutcomeMapper: ActionAreaOutcomeMapper,
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
  ): Promise<ActionAreaOutcomeV2Dto[]> {
    let actionAreaOutcomes: ActionAreaOutcome[] = [];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        actionAreaOutcomes = await this.actionAreaOutcomeRepository.find({
          relations: this._relations,
        });
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        actionAreaOutcomes = await this.actionAreaOutcomeRepository.find({
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

    return this.actionAreaOutcomeMapper.classListToDtoV2List(
      actionAreaOutcomes,
    );
  }

  async findOne(id: number) {
    const actionAreaOutcome = await this.actionAreaOutcomeRepository.findOne({
      where: {
        id,
        auditableFields: { is_active: true },
      },
      relations: this._relations,
    });

    return this.actionAreaOutcomeMapper.classToDtoV2(actionAreaOutcome);
  }
}
