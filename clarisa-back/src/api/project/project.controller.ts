import {
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
  Get,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ProjectService } from './project.service';

@ApiTags('Project')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({
    summary: 'List bilateral projects',
    description:
      'Official list of bilateral projects registered in CLARISA, with the CGIAR global unit that leads each one.',
  })
  async findAll() {
    return this.projectService.findAll();
  }

  @Get('by-global-unit/:officialCode')
  @ApiOperation({
    summary: 'List bilateral projects of a CGIAR global unit',
    description:
      'Same list as above, restricted to the projects led by one global unit.',
  })
  @ApiParam({
    name: 'officialCode',
    description: 'Official code of the CGIAR global unit, e.g. `CIAT`.',
  })
  async findByGlobalUnit(@Param('officialCode') officialCode: string) {
    return this.projectService.findByGlobalUnit(officialCode);
  }
}
