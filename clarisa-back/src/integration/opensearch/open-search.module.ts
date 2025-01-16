import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenSearchController } from './open-search.controller';
import { OpenSearchInstitutionModule } from './institution/open-search-institution.module';
import { OpenSearchCountryModule } from './country/open-search-country.module';
import { OpenSearchSubnationalModule } from './subnational/open-search-subnational.module';

@Module({
  imports: [
    HttpModule,
    OpenSearchInstitutionModule,
    OpenSearchCountryModule,
    OpenSearchSubnationalModule,
  ],
  controllers: [OpenSearchController],
})
export class OpenSearchModule {}
