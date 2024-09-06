import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ResponseDto } from '../entities/dtos/response.dto';
import { FinalResponseDto } from '../entities/dtos/final-response.dto';
import { Immutable } from '../utils/deep-immutable';
import { Request } from 'express';

@Injectable()
export class ResponseFormattingInterceptor<T>
  implements NestInterceptor<T, FinalResponseDto<T>>
{
  intercept(
    context: Immutable<ExecutionContext>,
    next: Immutable<CallHandler>,
  ): Observable<FinalResponseDto<T>> {
    const request: Request = context.switchToHttp().getRequest();
    return next.handle().pipe(
      //TODO uncomment this when the changes are shared with the apps connected to this api
      /*map((data: ResponseDto<T>) => {
        return FinalResponseDto.fromResponse(
          data,
          context.switchToHttp().getRequest().url,
        );
      }),*/
      catchError(
        (
          error: Immutable<object & { status?: HttpStatus; message?: string }>,
        ) => {
          const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
          const message = error.message || 'Internal server error';
          const errorDto = ResponseDto.buildCustomResponse(
            error,
            message,
            status,
          );
          return throwError(() =>
            FinalResponseDto.fromResponse(
              errorDto,
              request.url || 'NoURLAvailable',
            ),
          );
        },
      ),
    );
  }
}
