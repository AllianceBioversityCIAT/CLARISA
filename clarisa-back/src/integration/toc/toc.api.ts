import { HttpService } from '@nestjs/axios';
import { BaseApi } from '../base-api';
import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ResponseTocDto } from './dto/response.toc.dto';
import { PhaseTocDto } from './dto/phases.toc.dto';
import { AppConfig } from '../../shared/utils/app-config';

@Injectable()
export class TOCApi extends BaseApi {
  constructor(
    protected readonly httpService: HttpService,
    private _appConfig: AppConfig,
  ) {
    super(httpService, _appConfig.tocUrl, TOCApi.name);
  }

  getPhases(): Observable<AxiosResponse<ResponseTocDto<PhaseTocDto>>> {
    return this.getRequest('phases');
  }
}
