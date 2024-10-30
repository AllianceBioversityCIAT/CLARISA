import { HttpStatus } from '@nestjs/common';
import { classNameCleaner } from '../utils/class-name-cleaner';
import { BaseHttpError } from './base-http-error';

export class ExistingEntityError<T> extends BaseHttpError<T> {
  constructor(entityClass: string, additionalData?: T) {
    super(
      `A(n) ${classNameCleaner(entityClass)} with the same data already exists`,
      HttpStatus.CONFLICT,
      additionalData,
    );
    this.name = 'BadParamsError';
  }
}
