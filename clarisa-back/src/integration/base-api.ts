import { HttpService } from '@nestjs/axios';
import { Observable, catchError, of, timeout } from 'rxjs';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
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

  protected _getDefaultConfig(): AxiosRequestConfig {
    return {
      auth: { username: this.user, password: this.pass },
      httpsAgent: new https.Agent({
        // allow legacy server
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
      }),
    };
  }

  protected concatTimeoutError<T = any>(
    obserbable: Observable<AxiosResponse<T, any>>,
  ): Observable<AxiosResponse<T, any>> {
    return obserbable.pipe(
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

  protected getRequest<T>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T, any>> {
    const request = this.httpService.get(
      `${this.externalAppEndpoint}/${endpoint}`,
      config ?? this._getDefaultConfig(),
    );
    return this.concatTimeoutError(request);
  }

  protected patchRequest<T, D>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T, any>> {
    const request = this.httpService.patch(
      `${this.externalAppEndpoint}/${endpoint}`,
      data,
      config ?? this._getDefaultConfig(),
    );
    return this.concatTimeoutError(request);
  }

  protected postRequest<T, D>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T, any>> {
    const request = this.httpService.post(
      `${this.externalAppEndpoint}/${endpoint}`,
      data,
      config ?? this._getDefaultConfig(),
    );
    return this.concatTimeoutError(request);
  }

  protected deleteRequest<T>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T, any>> {
    const request = this.httpService.delete(
      `${this.externalAppEndpoint}/${endpoint}`,
      config ?? this._getDefaultConfig(),
    );
    return this.concatTimeoutError(request);
  }

  protected putRequest<T, D>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T, any>> {
    const request = this.httpService.put(
      `${this.externalAppEndpoint}/${endpoint}`,
      data,
      config ?? this._getDefaultConfig(),
    );
    return this.concatTimeoutError(request);
  }
}
