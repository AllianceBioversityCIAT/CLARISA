import { Controller, Get, Param, Query } from '@nestjs/common';
import { EnvironmentService } from './environment.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
export class EnvironmentController {
  constructor(private readonly environmentService: EnvironmentService) {}

  @Get()
  findAll(@Query('show') show: FindAllOptions) {
    return this.environmentService.findAll(show);
  }

  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.environmentService.findOne(+id);
  }
}
