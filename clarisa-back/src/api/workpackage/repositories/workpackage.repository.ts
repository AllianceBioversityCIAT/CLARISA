import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { WorkpackageDto } from '../dto/workpackage.dto';
import { Workpackage } from '../entities/workpackage.entity';

@Injectable()
export class WorkpackageRepository extends Repository<Workpackage> {
  constructor(private dataSource: DataSource) {
    super(Workpackage, dataSource.createEntityManager());
  }

  async findWorkpackages(
    showWorkpackages: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    showInitiatives: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    workpackageId?: number,
  ): Promise<WorkpackageDto[]> {
    let where = '';
    switch (showWorkpackages) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        where = `where stwp.is_active = ${
          showWorkpackages === FindAllOptions.SHOW_ONLY_ACTIVE ? 1 : 0
        } `;
        break;
    }

    switch (showInitiatives) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        where += `${where ? 'and' : 'where'} stis.is_active = ${
          showInitiatives === FindAllOptions.SHOW_ONLY_ACTIVE ? 1 : 0
        }`;
        break;
    }

    if (workpackageId) {
      where += `${where ? 'and' : 'where'} stwp.id = ${workpackageId}`;
    }

    const workpackageQuery = `
        select sti.id as initiative_id, sti.official_code as initiative_offical_code, stis.stage_id, 
          stis.status as initiative_status, stwp.wp_official_code, stwp.id as wp_id, stwp.name, stwp.acronym, 
          stwp.results, stwp.pathway_content, stwp.is_global_dimension as is_global, stwp.is_active as status,
          (
            select json_arrayagg(json_object(
              "id", r.id, 
              "name", r.name
            ))
            from submission_tool_work_package_regions stwpr_q1
            join regions r on stwpr_q1.region_id = r.id 
            where stwpr_q1.work_package_id = stwp.id and r.is_active = 1 and stwpr_q1.is_active = 1
            order by r.id
          ) regions,
          (
            select json_arrayagg(json_object(
              "id", c.id, 
              "iso_alpha_2", c.iso_alpha_2, 
              "name", c.name
            ))
            from submission_tool_work_package_countries stwpc_q1
            join countries c on stwpc_q1.country_id = c.id 
            where stwpc_q1.work_package_id = stwp.id and c.is_active = 1 and stwpc_q1.is_active = 1
            order by c.id
          ) countries
        from submission_tool_work_packages stwp 
        join submission_tool_initiative_stages stis on stwp.submission_tool_initiative_stage_id = stis.id
        join submission_tool_initiatives sti on stis.initiative_id = sti.id
        ${where}
        order by sti.id asc, stis.stage_id asc, stwp.wp_official_code asc;
    `;

    return this.query(workpackageQuery) as Promise<WorkpackageDto[]>;
  }
}
