import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { FrameworkService } from './framework.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
export class FrameworkController {
  constructor(private readonly _frameworkService: FrameworkService) {}
  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this._frameworkService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this._frameworkService.findOne(id);
  }
}
