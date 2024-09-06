import { Immutable } from '../utils/deep-immutable';

export abstract class BaseError<T> extends Error {
  cause: T;
  constructor(cause: T, error: Immutable<Error>) {
    super(error.message);
    this.name = error.name;
    this.stack = error.stack;
    this.cause = cause;
  }
}
