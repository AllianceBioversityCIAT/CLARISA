import { HttpService } from '@nestjs/axios';
import { BaseApi } from '../base-api';
import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { InitiativeResponse } from './dto/initivative.ost.dto';
import { ResponseOstDto } from './dto/response.ost.dto';
import { WorkpackageResponse } from './dto/workpackage.ost.dto';
import { InitiativeEoiResponse } from './dto/eoi.ost.dto';
import { AppConfig } from '../../shared/utils/app-config';

@Injectable()
export class OSTApi extends BaseApi {
  constructor(
    protected readonly httpService: HttpService,
    private _appConfig: AppConfig,
  ) {
    super(
      httpService,
      _appConfig.ostUrl,
      OSTApi.name,
      _appConfig.ostUser,
      _appConfig.ostPass,
    );
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
