import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ApiKeyUsageLog } from '../entities/api-key-usage-log.entity';

@Injectable()
export class ApiKeyUsageLogRepository extends Repository<ApiKeyUsageLog> {
  constructor(private dataSource: DataSource) {
    super(ApiKeyUsageLog, dataSource.createEntityManager());
  }
}
