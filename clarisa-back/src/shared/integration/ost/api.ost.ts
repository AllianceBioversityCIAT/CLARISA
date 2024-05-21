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
export class ApiOST extends BaseApi {
  constructor(protected readonly httpService: HttpService) {
    super();
    this.httpService = httpService;
    this.externalAppEndpoint = env.OST_URL;
    this.user = env.OST_USER;
    this.pass = env.OST_PASS;
    this.logger = new Logger(BaseApi.name);
  }

  getWorkpackages(): Observable<
    AxiosResponse<ResponseOstDto<WorkpackageResponse>>
  > {
    return this.getRequest('previews/packages');
  }

  getInitiatives(): Observable<
    AxiosResponse<ResponseOstDto<InitiativeResponse>>
  > {
    return this.getRequest<ResponseOstDto<InitiativeResponse>>('initiatives');
  }

  getStages() {
    return this.getRequest('initiatives/stages');
  }

  getEndOfIniciative(): Observable<
    AxiosResponse<ResponseOstDto<InitiativeEoiResponse>>
  > {
    return this.getRequest('stages-control/proposal/eoi/all/initiatives');
  }
}
