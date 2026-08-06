import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GlossaryPortfolio } from '../entities/glossary-portfolio.entity';

@Injectable()
export class GlossaryPortfolioRepository extends Repository<GlossaryPortfolio> {
  constructor(private dataSource: DataSource) {
    super(GlossaryPortfolio, dataSource.createEntityManager());
  }
}
