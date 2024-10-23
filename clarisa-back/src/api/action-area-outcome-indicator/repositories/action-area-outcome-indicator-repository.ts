import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { ActionAreaOutcomeDto } from '../../action-area-outcome/dto/action-area-outcome.dto';
import { ActionAreaOutcomeIndicatorDto } from '../dto/action-area-outcome-indicator.dto';
import { ActionAreaOutcomeIndicator } from '../entities/action-area-outcome-indicator.entity';

@Injectable()
export class ActionAreaOutcomeIndicatorRepository extends Repository<ActionAreaOutcomeIndicator> {
  constructor(private dataSource: DataSource) {
    super(ActionAreaOutcomeIndicator, dataSource.createEntityManager());
  }

  async findActionAreaOutcomes(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ActionAreaOutcomeDto[]> {
    return this.createQueryBuilder('aaoi')
      .leftJoinAndSelect(
        'aaoi.action_area_outcome_object',
        'aao',
        option === FindAllOptions.SHOW_ALL
          ? undefined
          : `aao.is_active = ${option === FindAllOptions.SHOW_ONLY_ACTIVE}`,
      )
      .leftJoinAndSelect('aaoi.action_area_object', 'aa')
      .leftJoinAndSelect('aaoi.outcome_indicator_object', 'oi')
      .where(
        option === FindAllOptions.SHOW_ALL
          ? undefined
          : `aaoi.is_active = ${option === FindAllOptions.SHOW_ONLY_ACTIVE}`,
      )
      .orderBy('aaoi.id')
      .select([
        'aaoi.id as id',
        'aa.id AS actionAreaId',
        'aa.name AS actionAreaName',
        'aao.id AS outcomeId',
        'aao.smo_code AS outcomeSMOcode',
        'aao.outcome_statement AS outcomeStatement',
        'oi.id AS outcomeIndicatorId',
        'oi.smo_code AS outcomeIndicatorSMOcode',
        'oi.outcome_indicator_statement AS outcomeIndicatorStatement',
      ])
      .getRawMany();
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
