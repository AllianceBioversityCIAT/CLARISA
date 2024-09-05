export class ResponseReportingDto<T> {
  response: T | T[];
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
}
