import { Injectable } from '@nestjs/common';
import { BaseOpenSearchApi } from '../base-open-search-api';
import { SubnationalScope } from '../../../api/subnational-scope/entities/subnational-scope.entity';
import { SubnationalScopeRepository } from '../../../api/subnational-scope/repositories/subnational-scope.repository';
import { HttpService } from '@nestjs/axios';
import { AppConfig } from '../../../shared/utils/app-config';
import { OpenSearchSubnationalDto } from './dto/open-search-subnational.dto';

@Injectable()
export class OpenSearchSubnationalApi extends BaseOpenSearchApi<
  SubnationalScope,
  OpenSearchSubnationalDto,
  SubnationalScopeRepository
> {
  constructor(
    httpService: HttpService,
    countryRepository: SubnationalScopeRepository,
    appConfig: AppConfig,
  ) {
    super(
      httpService,
      countryRepository,
      appConfig,
      undefined,
      OpenSearchSubnationalDto,
    );
  }
}
