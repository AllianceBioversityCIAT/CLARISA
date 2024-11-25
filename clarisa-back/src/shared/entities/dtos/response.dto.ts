import { HttpStatus } from '@nestjs/common';

export class ResponseDto<T> {
  private readonly response: T;
  private readonly message: string;
  private readonly status: HttpStatus;

  private constructor(response: T, message: string, status: HttpStatus) {
    this.response = response;
    this.message = message;
    this.status = status;
  }

  public static getResponse<T>(responseDto: ResponseDto<T>): T {
    return responseDto.response;
  }

  public static getMessage(responseDto: ResponseDto<any>): string {
    return responseDto.message;
  }

  public static getStatus(responseDto: ResponseDto<any>): HttpStatus {
    return responseDto.status;
  }

  static buildCreatedResponse<T>(
    response: T,
    serviceConstructor: new (...args: any[]) => any,
  ): ResponseDto<T> {
    return ResponseDto.buildCustomResponse(
      response,
      `${serviceConstructor.name.replace(
        'Service',
        '',
      )} has been created successfully`,
      HttpStatus.CREATED,
    );
  }

  static buildBadResponse<T>(
    response: T,
    serviceConstructor: new (...args: any[]) => any,
  ): ResponseDto<T> {
    return ResponseDto.buildCustomResponse(
      response,
      `${serviceConstructor.name.replace(
        'Service',
        '',
      )} could not be processed. Please check your input`,
      HttpStatus.BAD_REQUEST,
    );
  }

  static buildOkResponse<T>(response: T, message?: string): ResponseDto<T> {
    return ResponseDto.buildCustomResponse(
      response,
      message || 'Success',
      HttpStatus.OK,
    );
  }

  static buildCustomResponse<T>(
    response: T,
    message: string,
    status: HttpStatus,
  ): ResponseDto<T> {
    return new ResponseDto(response, message, status);
  }
}
