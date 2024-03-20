import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { InitiativeDto } from '../dto/initiative.dto';
import { StageDto } from '../dto/stage.dto';
import { Initiative } from '../entities/initiative.entity';

@Injectable()
export class InitiativeRepository extends Repository<Initiative> {
  constructor(private dataSource: DataSource) {
    super(Initiative, dataSource.createEntityManager());
  }

  async findAllInitiatives(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<InitiativeDto[]> {
    let isActiveCondition = '';
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        isActiveCondition = `stis.is_active = ${
          option === FindAllOptions.SHOW_ONLY_ACTIVE ? 1 : 0
        } and`;
        break;
    }

    const initiativeQuery = `
        select sti.id, sti.name, sti.short_name, sti.official_code, gu.global_unit_type_id as type_id,
            sti.is_active as active, stis.status, sts.id as stageId, sts.description,
            aa.id as action_area_id, aa.description as action_area_description
        from submission_tool_initiative_stages stis
        join submission_tool_initiatives sti on sti.id = stis.initiative_id
        join submission_tool_stages sts on sts.id = stis.stage_id
        join action_areas aa on aa.id = stis.action_area_id
        join global_units gu on sti.official_code = gu.smo_code
        where ${isActiveCondition} stis.id in (
            select stis.id from submission_tool_initiative_stages stis
            inner join (
                select stis_q1.initiative_id, max(stis_q1.stage_id) as max_stage from submission_tool_initiative_stages stis_q1 
                group by stis_q1.initiative_id
            ) as stis_max on stis.initiative_id = stis_max.initiative_id and stis.stage_id = stis_max.max_stage
        )
        order by stis.initiative_id;
    `;

    const initiativeStagesQuery = `
        select stis.initiative_id as id, stis.id as initvStgId, 
        stis.stage_id as stageId, stis.is_active as active
        from submission_tool_initiative_stages stis
        where stis.initiative_id = ?;
    `;

    const initiatives: InitiativeDto[] = await this.query(initiativeQuery);

    await Promise.all(
      initiatives.map(async (i) => {
        const initiativeStages: StageDto[] = await this.query(
          initiativeStagesQuery,
          [i.id],
        );
        i.stages = initiativeStages;
      }),
    );

    return initiatives;
  }
}
