import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly _logger: Logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const ipAddress =
      request.headers['x-forwarded-for'] || request.connection.remoteAddress;

    return next.handle().pipe(
      catchError((error) => {
        this._logger.warn(
          `[${request.method}] Request to "${request.url}" failed with request status ${error.status}. From: ${ipAddress}`,
        );
        throw error;
      }),
      tap(() => {
        const response = context.switchToHttp().getResponse();
        this._logger.verbose(
          `[${request.method}] Request to ${request.url}. Request Status: ${response.statusCode}. From: ${ipAddress}`,
        );
      }),
    );
  }
}
