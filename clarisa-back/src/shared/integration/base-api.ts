import { HttpService } from '@nestjs/axios';
import { Observable, catchError, of, timeout } from 'rxjs';
import { AxiosResponse } from 'axios';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import https from 'https';
import crypto from 'crypto';

export abstract class BaseApi {
  protected externalAppEndpoint: string;
  protected httpService: HttpService;
  protected user: string;
  protected pass: string;
  protected logger: Logger;

  private readonly httpsAgent = new https.Agent({ rejectUnauthorized: false });

  protected getRequest<T = any>(
    endpoint: string,
  ): Observable<AxiosResponse<T>> {
    return this.httpService
      .get(`${this.externalAppEndpoint}/${endpoint}`, {
        auth: { username: this.user, password: this.pass },
        httpsAgent: new https.Agent({
          // allow legacy server
          secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
        }),
        //httpsAgent: this.httpsAgent,
      })
      .pipe(
        timeout(30000), //we will wait 30 seconds for the response
        catchError((err) => {
          if (axios.isAxiosError(err)) {
            this.logger.error(`axios error: ${err.message}`);
          } else {
            this.logger.error(`unexpected error: ${err.message}`);
          }
          return of(null);
        }),
      );
  }
}
