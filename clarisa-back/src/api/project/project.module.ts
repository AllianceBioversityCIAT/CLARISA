import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectMappingRepository } from './repositories/project-mapping.repository';
import { ProjectRepository } from './repositories/project.repository';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, ProjectMappingRepository, ProjectRepository],
})
export class ProjectModule {}
