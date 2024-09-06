import { Immutable } from '../utils/deep-immutable';
import { BaseError } from './base.error';

export class DBError<T> extends BaseError<T> {
  constructor(cause: T, error?: Immutable<Error>) {
    super(
      cause,
      error ?? {
        message: 'There has been an error when performing a database operation',
        name: 'DBError',
      },
    );
  }
}
