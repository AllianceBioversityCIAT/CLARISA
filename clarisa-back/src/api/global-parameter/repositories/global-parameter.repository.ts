import { DataSource, Repository } from 'typeorm';
import { GlobalParameter } from '../entities/global-parameter.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GlobalParameterRepository extends Repository<GlobalParameter> {
  constructor(private dataSource: DataSource) {
    super(GlobalParameter, dataSource.createEntityManager());
  }
}
