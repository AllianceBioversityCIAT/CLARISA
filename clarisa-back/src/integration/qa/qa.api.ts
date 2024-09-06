import { Injectable, Logger } from '@nestjs/common';
import { TokenQaDto } from './dto/token-qa.dto';
import { env } from 'process';
import { BaseApi } from '../base-api';
import { HttpService } from '@nestjs/axios';
import { Immutable } from '../../shared/utils/deep-immutable';
import { Observable } from 'rxjs';

@Injectable()
export class QaApi extends BaseApi {
  constructor(protected readonly httpService: HttpService) {
    super();
    this.httpService = httpService;
    this.externalAppEndpoint = env.QA_URL as string;
    this.logger = new Logger(QaApi.name);
  }

  postQaToken(bodyTokenQa: Immutable<TokenQaDto>): Observable<unknown> {
    return this.postRequest(`auth/token-embed`, bodyTokenQa);
  }
}
