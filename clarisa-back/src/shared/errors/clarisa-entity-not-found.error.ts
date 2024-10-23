import { HttpStatus } from '@nestjs/common';
import { BaseHttpError } from './base-http-error';
import { classNameCleaner } from '../utils/class-name-cleaner';

export class ClarisaEntityNotFoundError<T> extends BaseHttpError<T> {
  constructor(
    entityClass: string,
    entityId: number | string,
    additionalData?: T,
  ) {
    super(
      `A(n) ${classNameCleaner(entityClass)} with id "${entityId}" could not be found`,
      HttpStatus.NOT_FOUND,
    );
    this.name = 'EntityNotFoundError';
    this.additionalData = additionalData;
  }
}
