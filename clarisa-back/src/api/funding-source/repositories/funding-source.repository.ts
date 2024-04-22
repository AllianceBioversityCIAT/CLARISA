import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FundingSource } from '../entities/funding-source.entity';

@Injectable()
export class FundingSourceRepository extends Repository<FundingSource> {
  constructor(private dataSource: DataSource) {
    super(FundingSource, dataSource.createEntityManager());
  }
}
