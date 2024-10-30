import { HttpStatus } from '@nestjs/common';
import { BaseHttpError } from './base-http-error';

export class InternalServerError<T> extends BaseHttpError<T> {
  //TODO add support email to the message
  constructor(message: string, additionalData?: T) {
    super(
      `${message} Please contact us and let us know about this error message`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      additionalData,
    );
    this.name = 'InternalServerError';
  }
}
