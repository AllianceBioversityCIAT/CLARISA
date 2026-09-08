import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { FinalResponseDto } from '../entities/dtos/final-response.dto';
import { ResponseDto } from '../entities/dtos/response.dto';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  constructor(private readonly _httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this._httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const path = request?.url ?? request?.originalUrl ?? '';

    if (this._isFinalResponseDto(exception)) {
      httpAdapter.reply(
        response,
        exception,
        FinalResponseDto.getStatus(exception),
      );
      return;
    }

    if (this._isResponseDto(exception)) {
      httpAdapter.reply(
        response,
        FinalResponseDto.fromResponse(exception, path),
        ResponseDto.getStatus(exception),
      );
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const payload =
        typeof exceptionResponse === 'string'
          ? { message: exceptionResponse }
          : exceptionResponse;

      httpAdapter.reply(
        response,
        FinalResponseDto.fromResponse(
          ResponseDto.buildCustomResponse(payload, exception.message, status),
          path,
        ),
        status,
      );
      return;
    }

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    httpAdapter.reply(
      response,
      FinalResponseDto.fromResponse(
        ResponseDto.buildCustomResponse(
          {},
          message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
        path,
      ),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private _isFinalResponseDto(
    exception: unknown,
  ): exception is FinalResponseDto<unknown> {
    return (
      !!exception &&
      typeof exception === 'object' &&
      exception.constructor?.name === FinalResponseDto.name &&
      'status' in exception &&
      'path' in exception
    );
  }

  private _isResponseDto(
    exception: unknown,
  ): exception is ResponseDto<unknown> {
    return (
      !!exception &&
      typeof exception === 'object' &&
      exception.constructor?.name === ResponseDto.name &&
      'status' in exception &&
      'message' in exception &&
      'response' in exception &&
      !('path' in exception)
    );
  }
}
