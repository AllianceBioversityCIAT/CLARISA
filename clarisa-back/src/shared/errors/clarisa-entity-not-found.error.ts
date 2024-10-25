import { HttpStatus } from '@nestjs/common';
import { BaseHttpError } from './base-http-error';
import { classNameCleaner } from '../utils/class-name-cleaner';

export class ClarisaEntityNotFoundError<T> extends BaseHttpError<T> {
  /*private constructor(
    entityClass: string,
    paramValue: number | string | { [key: string]: number | string }[],
    paramName: string = 'id',
    additionalData?: T,
  ) {
    super(
      `A(n) ${classNameCleaner(entityClass)} with ${paramName} = "${paramValue}" could not be found`,
      HttpStatus.NOT_FOUND,
    );
    this.name = 'EntityNotFoundError';
    this.additionalData = additionalData;
  }*/

  private constructor(message: string, additionalData?: T) {
    super(message, HttpStatus.NOT_FOUND, additionalData);
    this.name = 'EntityNotFoundError';
  }

  public static forSingleParam<T>(
    entityClass: string,
    paramName: string,
    paramValue: number | string,
    additionalData?: T,
  ) {
    return new ClarisaEntityNotFoundError(
      `A(n) ${classNameCleaner(entityClass)} with ${paramName} = "${paramValue}" could not be found`,
      additionalData,
    );
  }

  public static forId<T>(
    entityClass: string,
    id: number | string,
    additionalData?: T,
  ) {
    return ClarisaEntityNotFoundError.forSingleParam(
      entityClass,
      'id',
      id,
      additionalData,
    );
  }

  public static forMultipleParams<T>(
    entityClass: string,
    params: { [key: string]: number | string }[],
    additionalData?: T,
  ) {
    const paramsString = Object.entries(params)
      .map(([key, value]) => `${key} = "${value}"`)
      .join(', ');
    return new ClarisaEntityNotFoundError(
      `A(n) ${classNameCleaner(entityClass)} with params => "${paramsString}" could not be found`,
      additionalData,
    );
  }
}
