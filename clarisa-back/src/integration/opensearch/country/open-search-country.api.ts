import { Injectable } from '@nestjs/common';
import { BaseOpenSearchApi } from '../base-open-search-api';
import { Country } from '../../../api/country/entities/country.entity';
import { CountryRepository } from '../../../api/country/repositories/country.repository';
import { AppConfig } from '../../../shared/utils/app-config';
import { HttpService } from '@nestjs/axios';
import { OpenSearchCountryDto } from './dto/open-search-country.dto';

@Injectable()
export class OpenSearchCountryApi extends BaseOpenSearchApi<
  Country,
  OpenSearchCountryDto,
  CountryRepository
> {
  constructor(
    httpService: HttpService,
    countryRepository: CountryRepository,
    appConfig: AppConfig,
  ) {
    super(
      httpService,
      countryRepository,
      appConfig,
      undefined,
      OpenSearchCountryDto,
    );
  }
}
