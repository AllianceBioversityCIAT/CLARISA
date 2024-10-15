import { HttpStatus } from '@nestjs/common';
import { BaseHttpError } from './base-http-error';

export class BadParamsError<T> extends BaseHttpError<T> {
  constructor(
    entityClass: string,
    param: string,
    value: unknown,
    additionalData?: T,
  ) {
    super(
      `A bad parameter was provided for ${entityClass}: ${param} = ${value}`,
      HttpStatus.BAD_REQUEST,
    );
    this.name = 'BadParamsError';
    this.additionalData = additionalData;
  }
}
