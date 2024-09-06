import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { FinalResponseDto } from '../entities/dtos/final-response.dto';
import { Immutable } from '../utils/deep-immutable';

@Catch()
export class ExceptionsFilter<T> implements ExceptionFilter {
  constructor(private _httpAdapterHost: Immutable<HttpAdapterHost>) {}

  catch(exception: FinalResponseDto<T>, host: Immutable<ArgumentsHost>): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this._httpAdapterHost;

    const ctx = host.switchToHttp();

    httpAdapter.reply(
      ctx.getResponse(),
      exception,
      FinalResponseDto.getStatus(exception),
    );
  }
}
