import { Routes } from '@nestjs/core';
import { CronjobModule } from './cronjob/cronjob.module';
import { OpenSearchModule } from './opensearch/open-search.module';

export const integrationRoutes: Routes = [
  {
    path: 'cronjobs',
    module: CronjobModule,
  },
  {
    path: 'open-search',
    module: OpenSearchModule,
  },
];
