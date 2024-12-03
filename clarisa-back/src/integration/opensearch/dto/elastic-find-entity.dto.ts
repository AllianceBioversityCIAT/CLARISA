import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';

export interface ElasticFindEntity<EntityDto> {
  findDataForOpenSearch(
    option: FindAllOptions,
    ids?: number[],
  ): Promise<EntityDto[]>;
}
