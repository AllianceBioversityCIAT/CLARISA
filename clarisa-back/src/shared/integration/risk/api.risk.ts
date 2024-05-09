import { HttpService } from '@nestjs/axios';
import { BaseApi } from '../base-api';
import { env } from 'process';
import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ResponseRiskDto } from './dto/response.risk.dto';

@Injectable()
export class ApiRisk extends BaseApi {
  constructor(protected readonly httpService: HttpService) {
    super();
    this.httpService = httpService;
    this.externalAppEndpoint = env.RISK_URL;
    this.user = env.RISK_USER;
    this.pass = env.RISK_PASS;
    this.logger = new Logger(BaseApi.name);
  }

  getPhases(): Observable<AxiosResponse<ResponseRiskDto>> {
    return this.getRequest('phases');
  }
}
