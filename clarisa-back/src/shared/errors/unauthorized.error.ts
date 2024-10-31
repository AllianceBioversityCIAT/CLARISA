import { HttpStatus } from '@nestjs/common';
import { BaseHttpError } from './base-http-error';

export class UnauthorizedError<T> extends BaseHttpError<T> {
  constructor(message?: string, additionalData?: T) {
    super(
      message ??
        `Invalid credentials. Please check the provided login data and try again.`,
      HttpStatus.BAD_REQUEST,
      additionalData,
    );
    this.name = 'UnauthorizedError';
  }
}
