import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { HandlebarsTemplateService } from './handlebars-template.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiExcludeController,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { HandlebarsTemplate } from './entities/handlebars-template.entity';

@Controller()
@ApiExcludeController()
export class HandlebarsTemplateController {
  constructor(
    private readonly _handlebarsTemplateService: HandlebarsTemplateService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all Handlebars templates. Defaults to active.',
  })
  @ApiOkResponse({ type: [HandlebarsTemplate] })
  @ApiOperation({
    summary: 'Get all Handlebars templates, optionally filtered by status',
  })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this._handlebarsTemplateService.findAll(show);
  }

  @Get('get/id/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the Handlebars template',
  })
  @ApiOkResponse({ type: [HandlebarsTemplate] })
  @ApiOperation({
    summary: 'Get a Handlebars template by id',
  })
  async findOneById(@Param('id', ParseIntPipe) id: number) {
    return await this._handlebarsTemplateService.findOneById(id);
  }

  @Get('get/name/:name')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The name of the Handlebars template',
  })
  @ApiOkResponse({ type: [HandlebarsTemplate] })
  @ApiOperation({
    summary: 'Get a Handlebars template by name',
  })
  async findOneByName(@Param('name') name: string) {
    return await this._handlebarsTemplateService.findOneByName(name);
  }
}
