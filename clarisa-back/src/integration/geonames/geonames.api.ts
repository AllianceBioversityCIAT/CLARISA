import { HttpService } from '@nestjs/axios';
import { BaseApi } from '../base-api';
import { env } from 'process';
import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ResponseOstDto } from '../ost/dto/response.ost.dto';
import { OrderAministrativeDivisionDto } from '../ost/dto/order-administrative-division.dto';

@Injectable()
export class ApiGeoNames extends BaseApi {
  constructor(protected readonly httpService: HttpService) {
    super();
    this.httpService = httpService;
    this.externalAppEndpoint = `${env.GEONAME_URL}`;
    this.user = '';
    this.pass = '';
    this.logger = new Logger(BaseApi.name);
  }

  getFirstOrder(
    isoAlpha2: string,
  ): Observable<AxiosResponse<ResponseOstDto<OrderAministrativeDivisionDto>>> {
    return this.getRequest(
      `search?&username=${env.GEONAME_USER}&srv=163&country=${isoAlpha2}&featureCode=ADM1&lang=en&type=json`,
    );
  }

  getSecondOrder(
    isoAlpha2: string,
    adminCode1: string,
  ): Observable<AxiosResponse<ResponseOstDto<OrderAministrativeDivisionDto>>> {
    return this.getRequest(
      `search?&username=${env.GEONAME_USER}&srv=163&country=${isoAlpha2}&adminCode1=${adminCode1}&featureCode=ADM2&lang=en&type=json`,
    );
  }
}
