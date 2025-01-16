import { Routes } from '@nestjs/core';
import { OpenSearchInstitutionModule } from './institution/open-search-institution.module';
import { OpenSearchCountryModule } from './country/open-search-country.module';
import { OpenSearchSubnationalModule } from './subnational/open-search-subnational.module';

export const openSearchRoutes: Routes = [
  {
    path: 'institutions',
    module: OpenSearchInstitutionModule,
  },
  {
    path: 'countries',
    module: OpenSearchCountryModule,
  },
  {
    path: 'subnational',
    module: OpenSearchSubnationalModule,
  },
];
