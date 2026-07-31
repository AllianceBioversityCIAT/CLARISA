import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportingApi } from './reporting.api';
import { reportingDataSource } from '../../shared/database/reporting-data-source';
import { InnovationService } from './services/taat-innovation.service';
import { InnovationController } from './taat-innovation.controller';
import { ResultsOverviewService } from './services/results-overview.service';
import { ResultsOverviewController } from './results-overview.controller';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forRoot({
      ...reportingDataSource.options,
      name: 'reporting',
    }),
  ],
  providers: [ReportingApi, InnovationService, ResultsOverviewService],
  controllers: [InnovationController, ResultsOverviewController],
  exports: [ReportingApi, InnovationService, ResultsOverviewService],
})
export class ReportingModule {}
