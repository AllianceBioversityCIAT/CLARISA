import { Module } from '@nestjs/common';
import { IntegrationController } from './integration.controller';
import { QaApi } from './qa/qa.api';
import { CronjobModule } from './cronjob/cronjob.module';
import { OpenSearchModule } from './opensearch/open-search.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [CronjobModule, OpenSearchModule, HttpModule],
  providers: [QaApi],
  controllers: [IntegrationController],
  exports: [QaApi],
})
export class IntegrationModule {}
