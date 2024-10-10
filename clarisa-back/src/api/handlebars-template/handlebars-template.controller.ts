import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { HandlebarsTemplateService } from './handlebars-template.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
export class HandlebarsTemplateController {
  constructor(
    private readonly _handlebarsTemplateService: HandlebarsTemplateService,
  ) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this._handlebarsTemplateService.findAll(show);
  }

  @Get('get/id/:id')
  async findOneById(@Param('id', ParseIntPipe) id: number) {
    return await this._handlebarsTemplateService.findOneById(id);
  }

  @Get('get/name/:name')
  async findOneByName(@Param('name') name: string) {
    return await this._handlebarsTemplateService.findOneByName(name);
  }
}
