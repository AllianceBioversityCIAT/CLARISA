import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { MicroserviceMonitoringTestLinkService } from './microservice-monitoring-test-link.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';

@Controller()
export class MicroserviceMonitoringTestLinkController {
  constructor(
    private readonly microserviceMonitoringTestLinkService: MicroserviceMonitoringTestLinkService,
  ) {}

  @Get()
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.microserviceMonitoringTestLinkService.findAll(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.microserviceMonitoringTestLinkService.findOne(id);
  }
}
