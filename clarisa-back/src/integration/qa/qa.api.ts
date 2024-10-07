import { Injectable } from '@nestjs/common';
import { TokenQaDto } from './dto/token-qa.dto';
import { BaseApi } from '../base-api';
import { HttpService } from '@nestjs/axios';
import { AppConfig } from '../../shared/utils/app-config';

@Injectable()
export class QaApi extends BaseApi {
  constructor(
    protected readonly httpService: HttpService,
    private _appConfig: AppConfig,
  ) {
    super(httpService, _appConfig.qaUrl, QaApi.name);
  }

  postQaToken(bodyTokenQa: TokenQaDto) {
    return this.postRequest(`auth/token-embed`, bodyTokenQa);
  }
}
