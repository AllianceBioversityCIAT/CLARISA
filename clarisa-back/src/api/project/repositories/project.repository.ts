import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../entity/project.entity';

@Injectable()
export class ProjectRepository extends Repository<Project> {
  constructor(private readonly dataSource: DataSource) {
    super(Project, dataSource.createEntityManager());
  }

  async findAllWithRelations(): Promise<Project[]> {
    return this.find({
      where: {
        auditableFields: {
          is_active: true,
        },
      },
      relations: {
        lead_institution_object: true,
        funder_institution_object: true,
        project_countries_array: {
          country_object: true,
        },
        project_mappings_array: {
          global_unit_object: {
            cgiar_entity_type_object: true,
            institution_object: true,
            parent_object: true,
            portfolio_object: true,
          },
        },
      },
      order: {
        id: 'ASC',
        project_countries_array: {
          country_iso_numeric: 'ASC',
        },
        project_mappings_array: {
          global_unit_id: 'ASC',
        },
      },
    });
  }
}
