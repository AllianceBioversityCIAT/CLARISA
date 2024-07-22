import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { InitiativeDto } from '../dto/initiative.dto';
import { Initiative } from '../entities/initiative.entity';

@Injectable()
export class InitiativeRepository extends Repository<Initiative> {
  constructor(private dataSource: DataSource) {
    super(Initiative, dataSource.createEntityManager());
  }

  public findAllInitiatives(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<InitiativeDto[]> {
    return this._findInitiatives(option);
  }

  public findOneInitiativeById(id: number): Promise<InitiativeDto> {
    return this._findInitiatives(FindAllOptions.SHOW_ONLY_ACTIVE, id).then(
      (initiatives) => {
        return initiatives.length === 1 ? initiatives[0] : null;
      },
    );
  }

  public findOneInitiativeByOfficialCode(
    initiativeCode: string,
  ): Promise<InitiativeDto> {
    return this._findInitiatives(
      FindAllOptions.SHOW_ONLY_ACTIVE,
      null,
      initiativeCode,
    ).then((initiatives) => {
      return initiatives.length === 1 ? initiatives[0] : null;
    });
  }

  private _findInitiatives(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    initiativeId?: number,
    initiativeCode?: string,
  ) {
    let whereCondition = '';
    if (initiativeId) {
      whereCondition = `where sti.id = ${initiativeId}`;
    } else if (initiativeCode) {
      whereCondition = `where sti.official_code like %'${initiativeCode}'%`;
    }
    if (option !== FindAllOptions.SHOW_ALL) {
      if (whereCondition) {
        whereCondition += ` and stis.is_active = ${option === FindAllOptions.SHOW_ONLY_ACTIVE}`;
      } else {
        whereCondition = `where stis.is_active = ${option === FindAllOptions.SHOW_ONLY_ACTIVE}`;
      }
    }

    const query = `
      select
        sti.id, 
        sti.name, 
        sti.short_name, 
        sti.official_code, 
        gu.global_unit_type_id type_id,
        sti.is_active active, 
        stis.status, 
        sts.id stageId, 
        sts.description,
        aa.id action_area_id, 
        aa.description action_area_description,
        (
          select json_arrayagg(
            json_object(
              "id", stis.initiative_id, 
              "initvStgId", stis.id, 
              "stageId", stis.stage_id, 
              "active", stis.is_active
            )
          )
          from submission_tool_initiative_stages stis
          where stis.initiative_id = sti.id
          group by stis.initiative_id
        ) stages
      FROM submission_tool_initiatives sti
      LEFT JOIN submission_tool_initiative_stages stis ON stis.id = (
        SELECT max(s_q1.id)
        FROM submission_tool_initiative_stages s_q1
        WHERE s_q1.initiative_id = sti.id
      )
      LEFT JOIN submission_tool_stages sts ON stis.stage_id = sts.id 
      LEFT JOIN action_areas aa ON stis.action_area_id = aa.id
      left JOIN global_units gu ON sti.official_code = gu.smo_code
      ${whereCondition}
      ORDER BY sti.official_code;
    `;

    return this.query(query) as Promise<InitiativeDto[]>;
  }
}
