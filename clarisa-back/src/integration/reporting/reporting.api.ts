import { HttpService } from '@nestjs/axios';
import { BaseApi } from '../base-api';
import { env } from 'process';
import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ResponseReportingDto } from './dto/response.reporting.dto';
import { PhaseReportingDto } from './dto/phases.reporting.dto';
import { PRMSApplication } from '../../shared/entities/enums/prms-applications';

@Injectable()
export class ReportingApi extends BaseApi {
  constructor(protected readonly httpService: HttpService) {
    super();
    this.httpService = httpService;
    this.externalAppEndpoint = env.REPORTING_URL;
    this.user = env.REPORTING_USER;
    this.pass = env.REPORTING_PASS;
    this.logger = new Logger(ReportingApi.name);
  }

  getPhases(
    app: PRMSApplication = PRMSApplication.ALL,
  ): Observable<AxiosResponse<ResponseReportingDto<PhaseReportingDto>>> {
    return this.getRequest(
      `versioning?module=${app.simpleName}&status=all&active=all`,
    );
  }
}
