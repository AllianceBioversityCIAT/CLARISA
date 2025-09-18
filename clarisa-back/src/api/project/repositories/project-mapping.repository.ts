import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProjectMapping } from '../entity/project-mapping.entity';

@Injectable()
export class ProjectMappingRepository extends Repository<ProjectMapping> {
  constructor(private readonly dataSource: DataSource) {
    super(ProjectMapping, dataSource.createEntityManager());
  }

  async findFullByGlobalUnit(globalUnitId: number): Promise<ProjectMapping[]> {
    return this.find({
      where: {
        global_unit_id: globalUnitId,
        auditableFields: { is_active: true },
        project_object: {
          auditableFields: { is_active: true },
        },
      },
      relations: {
        global_unit_object: {
          cgiar_entity_type_object: true,
          institution_object: true,
          parent_object: true,
          portfolio_object: true,
        },
        project_object: {
          lead_institution_object: true,
          funder_institution_object: true,
          project_countries_array: {
            country_object: true,
          },
        },
      },
      order: {
        project_id: 'ASC',
      },
    });
  }
}
