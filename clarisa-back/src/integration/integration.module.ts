import { Module } from '@nestjs/common';
import { IntegrationController } from './integration.controller';
import { QaApi } from './qa/qa.api';
import { CronjobModule } from './cronjob/cronjob.module';
import { OpenSearchModule } from './opensearch/open-search.module';
import { HttpModule } from '@nestjs/axios';
import { HandlebarsTemplateModule } from '../api/handlebars-template/handlebars-template.module';
import { ReportingModule } from './reporting/reporting.module';

@Module({
  imports: [
    CronjobModule,
    OpenSearchModule,
    HttpModule,
    HandlebarsTemplateModule,
    ReportingModule,
  ],
  providers: [QaApi],
  controllers: [IntegrationController],
  exports: [QaApi, ReportingModule],
})
export class IntegrationModule {}
