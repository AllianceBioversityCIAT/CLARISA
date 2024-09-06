import { HttpService } from '@nestjs/axios';
import { BaseApi } from '../base-api';
import { env } from 'process';
import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ResponseTocDto } from './dto/response.toc.dto';
import { PhaseTocDto } from './dto/phases.toc.dto';

@Injectable()
export class TOCApi extends BaseApi {
  constructor(protected readonly httpService: HttpService) {
    super();
    this.httpService = httpService;
    this.externalAppEndpoint = env.TOC_URL as string;
    this.user = env.TOC_USER as string;
    this.pass = env.TOC_PASS as string;
    this.logger = new Logger(TOCApi.name);
  }

  getPhases(): Observable<
    AxiosResponse<ResponseTocDto<PhaseTocDto>> | undefined
  > {
    return this.getRequest('phases');
  }
}
