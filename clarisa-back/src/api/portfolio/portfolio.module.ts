import { Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { PortfolioRepository } from './repositories/portfolio.repository';
import { PortfolioMapper } from './mappers/portfolio.mapper';

@Module({
  controllers: [PortfolioController],
  providers: [PortfolioService, PortfolioRepository, PortfolioMapper],
})
export class PortfolioModule {}
