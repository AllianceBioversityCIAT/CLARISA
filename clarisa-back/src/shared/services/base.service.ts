import {
  EntityNotFoundError,
  EntityTarget,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { FindAllOptions } from '../entities/enums/find-all-options';
import { BadParamsError } from '../errors/bad-params.error';

export class BaseService<T> {
  constructor(private readonly _repository: Repository<T>) {}

  private get _entity(): EntityTarget<T> {
    return this._repository.target;
  }

  private get _primaryColumnPropertyName(): keyof T {
    return this._repository.metadata.columns.find((c) => c.isPrimary)
      .propertyName as keyof T;
  }

  private get _hasAuditableField(): boolean {
    return this._hasProperty('auditableField');
  }

  private get _baseWhere(): FindOptionsWhere<T> {
    const where = {} as unknown as FindOptionsWhere<T>;
    if (this._hasAuditableField) {
      where['auditableField'] = { is_active: true };
    }

    return where;
  }

  private _hasProperty(cn: string): boolean {
    return this._repository.metadata.columns.some((c) => c.propertyName === cn);
  }

  async findAllWithStatus<T_Dto>(
    show: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    transformer?: (entity: T) => T_Dto,
  ): Promise<T[] | T_Dto[]> {
    const where: FindOptionsWhere<T> = {};
    if (this._hasAuditableField) {
      switch (show) {
        case FindAllOptions.SHOW_ALL:
          // do nothing
          break;
        case FindAllOptions.SHOW_ONLY_ACTIVE:
          where['auditableField'] = { is_active: true };
          break;
        case FindAllOptions.SHOW_ONLY_INACTIVE:
          where['auditableField'] = { is_active: false };
          break;
        default:
          throw new BadParamsError(this._entity.toString(), 'show', show);
      }
    }

    return this._repository
      .findBy(where)
      .then((result) => (transformer ? result.map(transformer) : result));
  }

  async findOneById<T_Dto>(
    id: number,
    transformer?: (entity: T) => T_Dto,
  ): Promise<T | T_Dto> {
    return this.findOneByProperty(
      this._primaryColumnPropertyName,
      id,
      transformer,
    );
  }

  async findOneByProperty<T_Dto>(
    property: keyof T,
    value: unknown,
    transformer?: (entity: T) => T_Dto,
  ): Promise<T | T_Dto> {
    const where: FindOptionsWhere<T> = this._baseWhere;
    where[property] = value as FindOptionsWhere<T>[keyof T];

    return this._repository
      .findOneByOrFail(where)
      .then((result) => (transformer ? transformer(result) : result))
      .catch((error) => {
        if (error instanceof EntityNotFoundError) {
          throw new BadParamsError(
            this._entity.toString(),
            property.toString(),
            value,
          );
        }
        throw error;
      });
  }
}
