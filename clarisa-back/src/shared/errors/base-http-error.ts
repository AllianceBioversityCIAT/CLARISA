import { HttpStatusError } from './http-status-errors';

export class BaseHttpError<T> extends Error {
  constructor(
    message: string,
    public status: HttpStatusError,
    public additionalData?: T,
  ) {
    super(message);
    this.name = 'FileNotFoundError';
  }
}
