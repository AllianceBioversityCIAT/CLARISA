import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Outcome } from '../entities/outcome.entity';

@Injectable()
export class OutcomeRepository extends Repository<Outcome> {
  constructor(private dataSource: DataSource) {
    super(Outcome, dataSource.createEntityManager());
  }
}
