import { Injectable, Logger } from '@nestjs/common';
import { TokenQaDto } from './dto/token-qa.dto';
import { env } from 'process';
import { BaseApi } from '../base-api';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class QaApi extends BaseApi {
  constructor(protected readonly httpService: HttpService) {
    super();
    this.httpService = httpService;
    this.externalAppEndpoint = env.QA_URL;
    this.logger = new Logger(QaApi.name);
  }

  postQaToken(bodyTokenQa: TokenQaDto) {
    return this.postRequest(`auth/token-embed`, bodyTokenQa);
  }
}
