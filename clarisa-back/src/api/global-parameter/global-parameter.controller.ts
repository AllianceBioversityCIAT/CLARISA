import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { GlobalParameterService } from './global-parameter.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller()
@ApiExcludeController()
export class GlobalParameterController {
  constructor(
    private readonly _globalParameterService: GlobalParameterService,
  ) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this._globalParameterService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this._globalParameterService.findOne(id);
  }
}
