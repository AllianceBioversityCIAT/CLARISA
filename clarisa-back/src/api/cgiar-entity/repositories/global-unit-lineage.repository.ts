import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GlobalUnitLineage } from '../entities/global-unit-lineage.entity';

@Injectable()
export class GlobalUnitLineageRepository extends Repository<GlobalUnitLineage> {
  constructor(private readonly dataSource: DataSource) {
    super(GlobalUnitLineage, dataSource.createEntityManager());
  }
}
