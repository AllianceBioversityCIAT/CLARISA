import { DataSource, Repository } from 'typeorm';
import { MicroserviceMonitoringTestLink } from '../entities/microservice-monitoring-test-link.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MicroserviceMonitoringTestLinkRepository extends Repository<MicroserviceMonitoringTestLink> {
  constructor(private dataSource: DataSource) {
    super(MicroserviceMonitoringTestLink, dataSource.createEntityManager());
  }
}
