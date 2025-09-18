import { Injectable, BadRequestException } from '@nestjs/common';
import { Project } from './entity/project.entity';
import { ProjectMapping } from './entity/project-mapping.entity';
import { ProjectMappingRepository } from './repositories/project-mapping.repository';
import { ProjectRepository } from './repositories/project.repository';

@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectMappingRepository: ProjectMappingRepository,
  ) {}

  async findAll(): Promise<Project[]> {
    return this.projectRepository.findAllWithRelations();
  }

  async findByGlobalUnit(globalUnitId: number): Promise<ProjectMapping[]> {
    if (!Number.isInteger(globalUnitId) || globalUnitId <= 0) {
      throw new BadRequestException('globalUnitId must be a positive integer');
    }

    return this.projectMappingRepository.findFullByGlobalUnit(globalUnitId);
  }
}
