import { Controller, Get, Param, Query } from '@nestjs/common';
import { EnvironmentService } from './environment.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
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
      'Show active, inactive or all environments. Defaults to active.',
  })
  @ApiOkResponse({ type: [EnvironmentDto] })
  findAll(@Query('show') show: FindAllOptions) {
    return this.environmentService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the environment',
  })
  @ApiOkResponse({ type: [EnvironmentDto] })
  findOne(@Param('id') id: string) {
    return this.environmentService.findOne(+id);
  }
}
