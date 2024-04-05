import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Indicator } from '../entities/indicator.entity';

@Injectable()
export class IndicatorRepository extends Repository<Indicator> {
  constructor(private dataSource: DataSource) {
    super(Indicator, dataSource.createEntityManager());
  }
}
