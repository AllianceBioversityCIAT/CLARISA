import { Module } from '@nestjs/common';
import { ResultsOverviewController } from '../reporting/results-overview.controller';
import { ResultsOverviewService } from '../reporting/services/results-overview.service';

@Module({
  providers: [ResultsOverviewService],
  controllers: [ResultsOverviewController],
  exports: [ResultsOverviewService],
})
export class InnovationModule {}
