import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../entity/project.entity';

@Injectable()
export class ProjectRepository extends Repository<Project> {
  constructor(private readonly dataSource: DataSource) {
    super(Project, dataSource.createEntityManager());
  }

  async findAllWithRelations(phase?: number): Promise<Project[]> {
    const query = this.createQueryBuilder('project')
      .leftJoinAndSelect('project.lead_institution_object', 'lead_institution')
      .leftJoinAndSelect(
        'project.funder_institution_object',
        'funder_institution',
      )
      .leftJoinAndSelect(
        'project.project_countries_array',
        'project_country',
        'project_country.is_active = :active',
        { active: true },
      )
      .leftJoinAndSelect('project_country.country_object', 'country')
      .leftJoinAndSelect(
        'project.project_mappings_array',
        'project_mapping',
        'project_mapping.is_active = :active',
        { active: true },
      )
      .leftJoinAndSelect('project_mapping.global_unit_object', 'global_unit')
      .leftJoinAndSelect(
        'global_unit.cgiar_entity_type_object',
        'global_unit_type',
      )
      .leftJoinAndSelect(
        'global_unit.institution_object',
        'global_unit_institution',
      )
      .leftJoinAndSelect('global_unit.parent_object', 'global_unit_parent')
      .leftJoinAndSelect(
        'global_unit.portfolio_object',
        'global_unit_portfolio',
      )
      .where('project.is_active = :active', { active: true });

    if (phase !== undefined) {
      query.andWhere('project.phase = :phase', { phase });
    }

    return query
      .orderBy('project.id', 'ASC')
      .addOrderBy('project_country.country_code', 'ASC')
      .addOrderBy('project_mapping.program_id', 'ASC')
      .getMany();
  }
}
