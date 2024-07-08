import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Environment } from '../entities/environment.entity';

@Injectable()
export class EnvironmentRepository extends Repository<Environment> {
  constructor(private dataSource: DataSource) {
    super(Environment, dataSource.createEntityManager());
  }
}
