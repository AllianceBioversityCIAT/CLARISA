import { Module } from '@nestjs/common';
import { OpenSearchCountryController } from './open-search-country.controller';
import { OpenSearchCountryApi } from './open-search-country.api';
import { HttpModule } from '@nestjs/axios';
import { CountryRepository } from '../../../api/country/repositories/country.repository';

@Module({
  imports: [HttpModule],
  controllers: [OpenSearchCountryController],
  providers: [OpenSearchCountryApi, CountryRepository],
})
export class OpenSearchCountryModule {}
