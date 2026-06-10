import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';

@Injectable()
export class ApiKeyRepository extends Repository<ApiKey> {
  constructor(private dataSource: DataSource) {
    super(ApiKey, dataSource.createEntityManager());
  }
}
