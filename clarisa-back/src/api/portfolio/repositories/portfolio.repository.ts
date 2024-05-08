import { Injectable } from '@nestjs/common';
import { Portfolio } from '../entities/portfolio.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class PortfolioRepository extends Repository<Portfolio> {
  constructor(private dataSource: DataSource) {
    super(Portfolio, dataSource.createEntityManager());
  }
}
