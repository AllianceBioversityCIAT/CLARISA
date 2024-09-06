import { Immutable } from '../utils/deep-immutable';
import { BaseError } from './base.error';

export class ADAuthError<T> extends BaseError<T> {
  constructor(response: T, error?: Immutable<Error>) {
    super(
      response,
      error ?? {
        message:
          'There has been an error with the Active Directory authentication',
        name: 'ADAuthError',
      },
    );
  }
}
