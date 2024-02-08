import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Framework } from '../entities/framework.entity';

@Injectable()
export class FrameworkRepository extends Repository<Framework> {
  constructor(private dataSource: DataSource) {
    super(Framework, dataSource.createEntityManager());
  }
}
