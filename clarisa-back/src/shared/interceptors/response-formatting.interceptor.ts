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

@Injectable()
export class ResponseFormattingInterceptor<T>
  implements NestInterceptor<T, FinalResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<FinalResponseDto<T>> {
    return next.handle().pipe(
      //TODO uncomment this when the changes are shared with the apps connected to this api
      /*map((data: ResponseDto<T>) => {
        return FinalResponseDto.fromResponse(
          data,
          context.switchToHttp().getRequest().url,
        );
      }),*/
      catchError((error) => {
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
            context.switchToHttp().getRequest().url,
          ),
        );
      }),
    );
  }
}
