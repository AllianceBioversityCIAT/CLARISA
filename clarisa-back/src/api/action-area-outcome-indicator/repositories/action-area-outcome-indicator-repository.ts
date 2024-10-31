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

  async findActionAreaOutcomeIndicators(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    isAao: boolean = true,
    aaoiId?: number,
  ): Promise<ActionAreaOutcomeDto[] | ActionAreaOutcomeIndicatorDto[]> {
    const querybuilder = this.createQueryBuilder('aaoi')
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
          ? '1=1'
          : `aaoi.is_active = ${option === FindAllOptions.SHOW_ONLY_ACTIVE}`,
      )
      .andWhere(isAao ? '1=1' : aaoiId ? `aaoi.id = ${aaoiId}` : '1=1')
      .orderBy('aaoi.id')
      .select([
        `aaoi.id AS ${isAao ? 'id' : 'actionAreaOutcomeIndicatorId'}`,
        'aa.id AS actionAreaId',
        'aa.name AS actionAreaName',
        'aao.id AS outcomeId',
        'aao.smo_code AS outcomeSMOcode',
        'aao.outcome_statement AS outcomeStatement',
        'oi.id AS outcomeIndicatorId',
        `oi.smo_code AS ${isAao ? 'outcomeIndicatorSMOcode' : 'outcomeIndicatorsSMOcode'}`,
        'oi.outcome_indicator_statement AS outcomeIndicatorStatement',
      ])
      .getRawMany();

    return isAao
      ? (querybuilder as Promise<ActionAreaOutcomeDto[]>)
      : (querybuilder as Promise<ActionAreaOutcomeIndicatorDto[]>);
  }
}
