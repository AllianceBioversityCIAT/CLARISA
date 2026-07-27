import {
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ProjectService } from './project.service';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll(
    @Query('phase', new ParseIntPipe({ optional: true })) phase?: number,
  ) {
    return this.projectService.findAll(phase);
  }

  @Get('by-global-unit/:officialCode')
  async findByGlobalUnit(@Param('officialCode') officialCode: string) {
    return this.projectService.findByGlobalUnit(officialCode);
  }
}
