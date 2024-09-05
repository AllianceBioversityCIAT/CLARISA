export class ResponseTocDto<T> {
  page: number;
  pageCount: number;
  limit: number;
  total: number;
  data: T | T[];
}
