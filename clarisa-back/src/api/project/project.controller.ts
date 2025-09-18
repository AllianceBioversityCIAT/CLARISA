import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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

  @Get('by-global-unit/:globalUnitId')
  async findByGlobalUnit(
    @Param('globalUnitId', ParseIntPipe) globalUnitId: number,
  ) {
    return this.projectService.findByGlobalUnit(globalUnitId);
  }
}
