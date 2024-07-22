import { Controller, Get, Param, Query } from '@nestjs/common';
import { PhaseService } from './phase.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PhaseDto } from './dto/phase.dto';
import { PhaseStatus } from '../../shared/entities/enums/phase-status';
import { PRMSApplication } from '../../shared/entities/enums/prms-applications';

@Controller()
@ApiTags('Phases')
export class PhaseController {
  constructor(private readonly phaseService: PhaseService) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all phases. Defaults to active.',
  })
  @ApiQuery({
    name: 'status',
    enum: PhaseStatus.getAsEnumLikeObject(),
    required: false,
    description: 'Show only phases with a specific status. Defaults to open',
  })
  @ApiOkResponse({ type: [PhaseDto] })
  findAll(
    @Query('show') show: FindAllOptions,
    @Query('status') status: string,
  ) {
    return this.phaseService.findAll(show, status);
  }

  @Get('/by-application/:app')
  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: 'Show active, inactive or all phases. Defaults to active.',
  })
  @ApiQuery({
    name: 'status',
    enum: PhaseStatus.getAsEnumLikeObject(),
    required: false,
    description: 'Show only phases with a specific status. Defaults to open',
  })
  @ApiParam({
    name: 'app',
    enum: PRMSApplication.getAsEnumLikeObject(),
    required: false,
    description:
      'Show only phases from a specific application. Defaults to all.',
  })
  @ApiOkResponse({ type: [PhaseDto] })
  findAllByApplication(
    @Param('app') application: string,
    @Query('show') show: FindAllOptions,
    @Query('status') status: string,
  ) {
    return this.phaseService.findAllByApplication(application, show, status);
  }
}
