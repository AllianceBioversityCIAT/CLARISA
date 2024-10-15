import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Lever } from '../entities/lever.entity';

@Injectable()
export class LeverRepository extends Repository<Lever> {
  constructor(private dataSource: DataSource) {
    super(Lever, dataSource.createEntityManager());
  }
}
