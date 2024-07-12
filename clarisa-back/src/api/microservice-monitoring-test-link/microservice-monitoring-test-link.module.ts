import { Module } from '@nestjs/common';
import { MicroserviceMonitoringTestLinkService } from './microservice-monitoring-test-link.service';
import { MicroserviceMonitoringTestLinkController } from './microservice-monitoring-test-link.controller';
import { MicroserviceMonitoringTestLinkRepository } from './repositories/microservice-monitoring-test-link.repository';

@Module({
  controllers: [MicroserviceMonitoringTestLinkController],
  providers: [
    MicroserviceMonitoringTestLinkService,
    MicroserviceMonitoringTestLinkRepository,
  ],
})
export class MicroserviceMonitoringTestLinkModule {}
