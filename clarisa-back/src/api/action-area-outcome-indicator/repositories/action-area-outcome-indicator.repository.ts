import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ActionAreaOutcomeIndicator } from '../entities/action-area-outcome-indicator.entity';
import { ActionAreaOutcomeIndicatorV1Dto } from '../dto/action-area-outcome-indicator.v1.dto';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';

@Injectable()
export class ActionAreaOutcomeIndicatorRepository extends Repository<ActionAreaOutcomeIndicator> {
  constructor(private dataSource: DataSource) {
    super(ActionAreaOutcomeIndicator, dataSource.createEntityManager());
  }

  async findAAOIS(
    option: FindAllOptions,
    id?: number,
  ): Promise<ActionAreaOutcomeIndicatorV1Dto[]> {
    const query = `
      SELECT aaoi.id, aa.id actionAreaId, aa.name actionAreaName, o.id outcomeId, 
          o.smo_code outcomeSMOcode, o.outcome_statement outcomeStatement, i.id outcomeIndicatorId, 
          i.smo_code outcomeIndicatorSMOcode, i.outcome_indicator_statement outcomeIndicatorStatement
      from action_area_outcome_indicators aaoi
      left join action_area_outcomes aao on aaoi.action_area_outcome_id = aao.id
      left join action_areas aa on aao.action_area_id = aa.id
      left join outcomes o on aao.outcome_id = o.id
      left join indicators i on aaoi.indicator_id = i.id
        ${
          option === FindAllOptions.SHOW_ALL
            ? ''
            : `where aaoi.is_active = ${
                option === FindAllOptions.SHOW_ONLY_ACTIVE
              }`
        }
        ${
          !id
            ? ''
            : option === FindAllOptions.SHOW_ALL
            ? 'where aaoi.id = ?'
            : 'and aaoi.id = ?'
        }
    `;
    try {
      const aaos = await this.query(query, id ? [id] : []);
      return aaos as ActionAreaOutcomeIndicatorV1Dto[];
    } catch (error) {
      throw error;
    }
  }
}
