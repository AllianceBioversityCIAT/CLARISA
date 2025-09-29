import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ProjectService } from './project.service';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll() {
    return this.projectService.findAll();
  }

  @Get('by-global-unit/:officialCode')
  async findByGlobalUnit(@Param('officialCode') officialCode: string) {
    return this.projectService.findByGlobalUnit(officialCode);
  }
}
