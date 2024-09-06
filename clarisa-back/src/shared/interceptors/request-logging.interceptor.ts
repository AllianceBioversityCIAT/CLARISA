import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { catchError, tap } from 'rxjs/operators';
import { Immutable } from '../utils/deep-immutable';
import { Request, Response } from 'express';
import { FinalResponseDto } from '../entities/dtos/final-response.dto';
import { Observable } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly _logger: Logger = new Logger('RequestLoggingInterceptor');
  intercept(
    context: Immutable<ExecutionContext>,
    next: Immutable<CallHandler>,
  ): Observable<unknown> {
    const request: Request = context.switchToHttp().getRequest();
    const ipAddress: string | undefined =
      (request.headers['x-forwarded-for'] as string | undefined) ||
      request.socket.remoteAddress;

    return next.handle().pipe(
      catchError((error) => {
        this._logger.warn(
          `[${request.method}] Request to "${request.url}" failed with request status ${FinalResponseDto.getStatus(error as FinalResponseDto<unknown>)}. From: ${ipAddress}`,
        );
        throw error;
      }),
      tap(() => {
        const response: Response = context.switchToHttp().getResponse();
        this._logger.verbose(
          `[${request.method}] Request to ${request.url}. Request Status: ${response.statusCode}. From: ${ipAddress}`,
        );
      }),
    );
  }
}
