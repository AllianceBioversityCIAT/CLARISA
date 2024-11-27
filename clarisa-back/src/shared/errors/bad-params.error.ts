import { HttpStatus } from '@nestjs/common';
import { BaseHttpError } from './base-http-error';
import { classNameCleaner } from '../utils/class-name-cleaner';

export class BadParamsError<T> extends BaseHttpError<T> {
  constructor(
    entityClass: string,
    param: string,
    value: unknown,
    additionalData?: T,
  ) {
    super(
      `A bad parameter was provided when finding ${classNameCleaner(entityClass)}: ${param} = ${value}`,
      HttpStatus.BAD_REQUEST,
      additionalData,
    );
    this.name = 'BadParamsError';
  }
}
