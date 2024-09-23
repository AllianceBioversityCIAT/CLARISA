import { Routes } from '@nestjs/core';
import { OpenSearchInstitutionModule } from './institution/open-search-institution.module';

export const openSearchRoutes: Routes = [
  {
    path: 'institutions',
    module: OpenSearchInstitutionModule,
  },
];
