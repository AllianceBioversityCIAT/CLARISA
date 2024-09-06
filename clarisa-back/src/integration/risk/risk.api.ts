import { HttpService } from '@nestjs/axios';
import { BaseApi } from '../base-api';
import { env } from 'process';
import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ResponseRiskDto } from './dto/response.risk.dto';

@Injectable()
export class RiskApi extends BaseApi {
  constructor(protected readonly httpService: HttpService) {
    super();
    this.httpService = httpService;
    this.externalAppEndpoint = env.RISK_URL as string;
    this.user = env.RISK_USER as string;
    this.pass = env.RISK_PASS as string;
    this.logger = new Logger(RiskApi.name);
  }

  getPhases(): Observable<AxiosResponse<ResponseRiskDto>> {
    return this.getRequest('phases');
  }
}
