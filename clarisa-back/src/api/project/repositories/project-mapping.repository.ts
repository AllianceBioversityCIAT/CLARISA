import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProjectMapping } from '../entity/project-mapping.entity';

@Injectable()
export class ProjectMappingRepository extends Repository<ProjectMapping> {
  constructor(private readonly dataSource: DataSource) {
    super(ProjectMapping, dataSource.createEntityManager());
  }

  async findFullByGlobalUnit(officialCode: string): Promise<ProjectMapping[]> {
    return this.createQueryBuilder('project_mapping')
      .innerJoinAndSelect(
        'project_mapping.project_object',
        'project',
        'project.is_active = :active',
        { active: true },
      )
      .innerJoinAndSelect(
        'project_mapping.global_unit_object',
        'global_unit',
        'global_unit.smo_code = :officialCode',
        { officialCode },
      )
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
      .where('project_mapping.is_active = :active', { active: true })
      .orderBy('project_mapping.project_id', 'ASC')
      .getMany();
  }
}
