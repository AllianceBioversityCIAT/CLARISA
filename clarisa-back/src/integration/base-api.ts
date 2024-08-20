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

  protected concatTimeoutError<T>(
    observable: Observable<AxiosResponse<T, any>>,
    returnError: boolean = false,
  ): Observable<AxiosResponse<T, any> | null> {
    return observable.pipe(
      timeout(30000), // Wait for 30 seconds for the response
      catchError((err) => {
        if (axios.isAxiosError(err)) {
          this.logger.error(
            `Axios error: ${err.message}; Axios error response: ${JSON.stringify(
              err.response?.data,
            )}`,
          );
          return of(returnError ? err : null);
        } else {
          this.logger.error(`Unexpected error: ${err.message}`);
          return of(returnError ? err : null);
        }
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

  protected patchRequest<D, R>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<R, any>> {
    const request = this.httpService.patch<R>(
      `${this.externalAppEndpoint}/${endpoint}`,
      data,
      config ?? this._getDefaultConfig(),
    );
    return this.concatTimeoutError(request);
  }

  protected postRequest<D, R>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<R, any>> {
    const request = this.httpService.post<R>(
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
    const request = this.httpService.delete<T>(
      `${this.externalAppEndpoint}/${endpoint}`,
      config ?? this._getDefaultConfig(),
    );
    return this.concatTimeoutError(request);
  }

  protected putRequest<D, R>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<R, any>> {
    const request = this.httpService.put<R>(
      `${this.externalAppEndpoint}/${endpoint}`,
      data,
      config ?? this._getDefaultConfig(),
    );
    return this.concatTimeoutError(request);
  }
}
