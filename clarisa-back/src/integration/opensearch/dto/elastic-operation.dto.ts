export class ElasticOperationDto<T> {
  constructor(
    public readonly operation: 'DELETE' | 'PATCH',
    public readonly data: T,
  ) {}
}
