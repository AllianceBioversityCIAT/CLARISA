import { HttpService } from '@nestjs/axios';
import { BaseApi } from '../base-api';
import { env } from 'process';
import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { InitiativeResponse } from './dto/initivative.ost.dto';
import { ResponseOstDto } from './dto/response.ost.dto';
import { WorkpackageResponse } from './dto/workpackage.ost.dto';
import { InitiativeEoiResponse } from './dto/eoi.ost.dto';

@Injectable()
export class OSTApi extends BaseApi {
  constructor(protected readonly httpService: HttpService) {
    super();
    this.httpService = httpService;
    this.externalAppEndpoint = env.OST_URL as string;
    this.user = env.OST_USER as string;
    this.pass = env.OST_PASS as string;
    this.logger = new Logger(OSTApi.name);
  }

  getWorkpackages(): Observable<
    AxiosResponse<ResponseOstDto<WorkpackageResponse>> | undefined
  > {
    return this.getRequest('previews/packages');
  }

  getInitiatives(): Observable<
    AxiosResponse<ResponseOstDto<InitiativeResponse>> | undefined
  > {
    return this.getRequest('initiatives');
  }

  getStages(): Observable<unknown> {
    return this.getRequest('initiatives/stages');
  }

  getEndOfIniciative(): Observable<
    AxiosResponse<ResponseOstDto<InitiativeEoiResponse>> | undefined
  > {
    return this.getRequest('stages-control/proposal/eoi/all/initiatives');
  }
}
