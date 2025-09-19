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

  async findByGlobalUnit(officialCode: string): Promise<ProjectMapping[]> {
    const sanitizedCode = officialCode?.trim();

    if (!sanitizedCode) {
      throw new BadRequestException('officialCode must be a non-empty string');
    }

    return this.projectMappingRepository.findFullByGlobalUnit(sanitizedCode);
  }
}
