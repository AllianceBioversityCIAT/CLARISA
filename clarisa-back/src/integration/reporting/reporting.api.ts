import { HttpService } from '@nestjs/axios';
import { BaseApi } from '../base-api';
import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ResponseReportingDto } from './dto/response.reporting.dto';
import { PhaseReportingDto } from './dto/phases.reporting.dto';
import { PRMSApplication } from '../../shared/entities/enums/prms-applications';
import { AppConfig } from '../../shared/utils/app-config';

@Injectable()
export class ReportingApi extends BaseApi {
  constructor(
    protected readonly httpService: HttpService,
    private _appConfig: AppConfig,
  ) {
    super(httpService, _appConfig.reportingUrl, ReportingApi.name);
  }

  getPhases(
    app: PRMSApplication = PRMSApplication.ALL,
  ): Observable<AxiosResponse<ResponseReportingDto<PhaseReportingDto>>> {
    return this.getRequest(
      `versioning?module=${app.simpleName}&status=all&active=all`,
    );
  }
}
