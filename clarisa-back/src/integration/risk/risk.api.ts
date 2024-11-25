import { HttpService } from '@nestjs/axios';
import { BaseApi } from '../base-api';
import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ResponseRiskDto } from './dto/response.risk.dto';
import { AppConfig } from '../../shared/utils/app-config';

@Injectable()
export class RiskApi extends BaseApi {
  constructor(
    protected readonly httpService: HttpService,
    private _appConfig: AppConfig,
  ) {
    super(httpService, _appConfig.riskUrl, RiskApi.name);
  }

  getPhases(): Observable<AxiosResponse<ResponseRiskDto>> {
    return this.getRequest('phases');
  }
}
