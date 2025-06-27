import { Routes } from '@nestjs/core';
import { CronjobModule } from './cronjob/cronjob.module';
import { OpenSearchModule } from './opensearch/open-search.module';
import { openSearchRoutes } from './opensearch/open-search.routes';
import { ReportingModule } from './reporting/reporting.module';

export const integrationRoutes: Routes = [
  {
    path: 'cronjobs',
    module: CronjobModule,
  },
  {
    path: 'open-search',
    module: OpenSearchModule,
    children: openSearchRoutes,
  },
  {
    path: 'taat',
    module: ReportingModule,
  },
];
