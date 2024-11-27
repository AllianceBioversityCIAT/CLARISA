import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { EnvironmentService } from './environment.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { EnvironmentDto } from './dto/environment.dto';

@Controller()
@ApiTags('Environments')
export class EnvironmentController {
  constructor(private readonly environmentService: EnvironmentService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all app environments. Defaults to active.',
  })
  @ApiOkResponse({ type: [EnvironmentDto] })
  @ApiOperation({
    summary: 'Get all app environments, optionally filtered by status',
  })
  findAll(@Query('show') show: FindAllOptions) {
    return this.environmentService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the app environment',
  })
  @ApiOkResponse({ type: [EnvironmentDto] })
  @ApiOperation({
    summary: 'Get an app environment by id',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.environmentService.findOne(id);
  }
}
