import { Injectable } from '@nestjs/common';
import { BaseOpenSearchApi } from '../base-open-search-api';
import { Institution } from '../../../api/institution/entities/institution.entity';
import { InstitutionRepository } from '../../../api/institution/repositories/institution.repository';
import { InstitutionDto } from '../../../api/institution/dto/institution.dto';
import { AppConfig } from '../../../shared/utils/app-config';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class OpenSearchInstitutionApi extends BaseOpenSearchApi<
  Institution,
  InstitutionDto,
  InstitutionRepository
> {
  constructor(
    httpService: HttpService,
    institutionRepository: InstitutionRepository,
    appConfig: AppConfig,
  ) {
    super(httpService, institutionRepository, appConfig, 'code');
  }
}
