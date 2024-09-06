import { HttpStatus } from '@nestjs/common';
import { ResponseDto } from './response.dto';

export class FinalResponseDto<T> {
  private readonly response: T;
  private readonly message: string;
  private readonly status: HttpStatus;
  private readonly date: string;
  private readonly path: string;

  private constructor(
    response: T,
    message: string,
    status: HttpStatus,
    date: string,
    path: string,
  ) {
    this.response = response;
    this.message = message;
    this.status = status;
    this.date = date;
    this.path = path;
  }

  static fromResponse<T>(
    responseDto: ResponseDto<T>,
    path: string,
  ): FinalResponseDto<T> {
    return new FinalResponseDto(
      ResponseDto.getResponse(responseDto),
      ResponseDto.getMessage(responseDto),
      ResponseDto.getStatus(responseDto),
      new Date().toISOString(),
      path,
    );
  }

  public static getResponse<T>(responseDto: FinalResponseDto<T>): T {
    return responseDto.response;
  }

  public static getStatus<T>(responseDto: FinalResponseDto<T>): HttpStatus {
    return responseDto.status;
  }
}
