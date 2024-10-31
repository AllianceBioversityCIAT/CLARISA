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
  findAll(@Query('show') show: FindAllOptions) {
    return this._globalParameterService.findAll(show);
  }

  @Get('get/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this._globalParameterService.findOne(id);
  }
}
