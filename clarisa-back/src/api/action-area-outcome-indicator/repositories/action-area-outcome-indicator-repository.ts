import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { ActionAreaOutcomeDto } from '../../action-area-outcome/dto/action-area-outcome.dto';
import { ActionAreaOutcomeIndicator } from '../entities/action-area-outcome-indicator.entity';
import { ActionAreaOutcomeIndicatorDto } from '../dto/action-area-outcome-indicator.dto';

@Injectable()
export class ActionAreaOutcomeIndicatorRepository extends Repository<ActionAreaOutcomeIndicator> {
  constructor(private dataSource: DataSource) {
    super(ActionAreaOutcomeIndicator, dataSource.createEntityManager());
  }

  async findAllActionAreaOutcomes(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ActionAreaOutcomeDto[]> {
    const actionAreaOutcomeDtos: ActionAreaOutcomeDto[] = [];
    let whereClause: FindOptionsWhere<ActionAreaOutcomeIndicator> = {};
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
          action_area_outcome_object: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        };
        break;
    }

    const actionAreaOutcomeIndicator: ActionAreaOutcomeIndicator[] =
      await this.find({
        where: whereClause,
        relations: {
          action_area_object: true,
          action_area_outcome_object: true,
          outcome_indicator_object: true,
        },
      });

    await Promise.all(
      actionAreaOutcomeIndicator.map(async (aaoi) => {
        const actionAreaOutcomeDto: ActionAreaOutcomeDto =
          new ActionAreaOutcomeDto();

        actionAreaOutcomeDto.id = aaoi.id;

        if (aaoi.action_area_object) {
          actionAreaOutcomeDto.actionAreaId = aaoi.action_area_id;
          actionAreaOutcomeDto.actionAreaName = aaoi.action_area_object.name;
        }

        if (aaoi.action_area_outcome_object) {
          actionAreaOutcomeDto.outcomeId = aaoi.action_area_outcome_id;
          actionAreaOutcomeDto.outcomeSMOcode =
            aaoi.action_area_outcome_object.smo_code;
          actionAreaOutcomeDto.outcomeStatement =
            aaoi.action_area_outcome_object.outcome_statement;
        }

        if (aaoi.outcome_indicator_object) {
          actionAreaOutcomeDto.outcomeIndicatorId = aaoi.outcome_indicator_id;
          actionAreaOutcomeDto.outcomeIndicatorSMOcode =
            aaoi.outcome_indicator_object.smo_code;
          actionAreaOutcomeDto.outcomeIndicatorStatement =
            aaoi.outcome_indicator_object.outcome_indicator_statement;
        }

        actionAreaOutcomeDtos.push(actionAreaOutcomeDto);
      }),
    );

    return actionAreaOutcomeDtos;
  }

  async actionAreaOutcomeIndicatorByAll(): Promise<
    ActionAreaOutcomeIndicatorDto[]
  > {
    const impactAreaIndicatorsQuery = `
      SELECT aai.id as 'actionAreaOutcomeIndicatorId', aa.id AS 'actionAreaId', aa.name AS 'actionAreaName', aao.id AS 'outcomeId', 
        aao.smo_code AS 'outcomeSMOcode', aao.outcome_statement AS 'outcomeStatement', 
          oi.id AS 'outcomeIndicatorId', oi.smo_code AS 'outcomeIndicatorsSMOcode', oi.outcome_indicator_statement AS 'outcomeIndicatorStatement'
        FROM action_area_outcome_indicators aai
      LEFT JOIN action_area_outcomes aao 
        ON aai.action_area_outcome_id = aao.id
      LEFT JOIN  action_areas aa
        ON aai.action_area_id = aa.id
      LEFT JOIN outcome_indicators oi
        ON  aai.outcome_indicator_id = oi.id;
            `;

    const ImpactAreaIndicatorsbyImpactArea: ActionAreaOutcomeIndicatorDto[] =
      await this.query(impactAreaIndicatorsQuery);

    return ImpactAreaIndicatorsbyImpactArea;
  }

  async actionAreaOutcomeIndicatorByAllIsActive(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ActionAreaOutcomeIndicatorDto[]> {
    let isActiveOption = true;
    if (option == 'inactive') isActiveOption = false;

    const impactAreaIndicatorsQuery = `
    SELECT aai.id as 'actionAreaOutcomeIndicatorId', aa.id AS 'actionAreaId', aa.name AS 'actionAreaName', aao.id AS 'outcomeId', 
        aao.smo_code AS 'outcomeSMOcode', aao.outcome_statement AS 'outcomeStatement', 
          oi.id AS 'outcomeIndicatorId', oi.smo_code AS 'outcomeIndicatorsSMOcode',
                          oi.outcome_indicator_statement AS 'outcomeIndicatorStatement'
        FROM action_area_outcome_indicators aai
      LEFT JOIN action_area_outcomes aao 
        ON aai.action_area_outcome_id = aao.id
      LEFT JOIN  action_areas aa
        ON aai.action_area_id = aa.id
      LEFT JOIN outcome_indicators oi
        ON  aai.outcome_indicator_id = oi.id
        WHERE aai.is_active = ${isActiveOption}
            `;

    const ImpactAreaIndicatorsbyImpactArea: ActionAreaOutcomeIndicatorDto[] =
      await this.query(impactAreaIndicatorsQuery);

    return ImpactAreaIndicatorsbyImpactArea;
  }
}
