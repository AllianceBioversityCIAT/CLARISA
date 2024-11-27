import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ScienceGroup } from '../entities/science-group.entity';

@Injectable()
export class ScienceGroupRepository extends Repository<ScienceGroup> {
  constructor(private dataSource: DataSource) {
    super(ScienceGroup, dataSource.createEntityManager());
  }
}
