import { HttpService } from '@nestjs/axios';
import { BaseApi } from '../base-api';
import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ResponseOstDto } from '../ost/dto/response.ost.dto';
import { OrderAministrativeDivisionDto } from '../ost/dto/order-administrative-division.dto';
import { AppConfig } from '../../shared/utils/app-config';

@Injectable()
export class ApiGeoNames extends BaseApi {
  constructor(
    protected readonly httpService: HttpService,
    private appConfig: AppConfig,
  ) {
    super(httpService, appConfig.geonameUrl, ApiGeoNames.name);
  }

  getFirstOrder(
    isoAlpha2: string,
  ): Observable<AxiosResponse<ResponseOstDto<OrderAministrativeDivisionDto>>> {
    return this.getRequest(
      `search?&username=${this.appConfig.geonameUser}&srv=163&country=${isoAlpha2}&featureCode=ADM1&lang=en&type=json`,
    );
  }

  getSecondOrder(
    isoAlpha2: string,
    adminCode1: string,
  ): Observable<AxiosResponse<ResponseOstDto<OrderAministrativeDivisionDto>>> {
    return this.getRequest(
      `search?&username=${this.appConfig.geonameUser}&srv=163&country=${isoAlpha2}&adminCode1=${adminCode1}&featureCode=ADM2&lang=en&type=json`,
    );
  }
}
