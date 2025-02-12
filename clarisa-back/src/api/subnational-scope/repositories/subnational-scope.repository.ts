import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SubnationalScope } from '../entities/subnational-scope.entity';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { SubnationalScopeDto } from '../dto/subnational-scope.dto';
import { SubnationalQueryParameters } from '../dto/subnational-query-parameters.dro';
import { ElasticFindEntity } from '../../../integration/opensearch/dto/elastic-find-entity.dto';
import { OpenSearchSubnationalDto } from '../../../integration/opensearch/subnational/dto/open-search-subnational.dto';

@Injectable()
export class SubnationalScopeRepository
  extends Repository<SubnationalScope>
  implements ElasticFindEntity<OpenSearchSubnationalDto>
{
  constructor(private dataSource: DataSource) {
    super(SubnationalScope, dataSource.createEntityManager());
  }

  findDataForOpenSearch(
    option: FindAllOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ids?: number[],
  ): Promise<OpenSearchSubnationalDto[]> {
    return this.findSubnationalScope(option) as unknown as Promise<
      OpenSearchSubnationalDto[]
    >;
  }

  async findSubnationalScope(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    countryId?: number,
    countryIsoAlpha2?: string,
  ): Promise<SubnationalScopeDto[]> {
    let subnationalScopeDtos: SubnationalScopeDto[] = [];
    let queryParams: SubnationalQueryParameters = {
      country_id: countryId,
      country_iso2: countryIsoAlpha2,
    };

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        queryParams = {
          ...queryParams,
          is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE ? 1 : 0,
        };
        break;
      default:
        throw Error('?!');
    }

    const query: string = `select getSubnationalScopeData(?) as subnational_scope_data;`;

    const rawResponse = (
      await this.query(query, [JSON.stringify(queryParams)])
    )[0];
    subnationalScopeDtos = rawResponse?.subnational_scope_data;

    return subnationalScopeDtos;
  }

  async findOneSubnationalScope(
    subnationalId?: number,
    subnationalCode?: string,
  ): Promise<SubnationalScopeDto> {
    let subnationalScopeDtos: SubnationalScopeDto[] = [];
    const queryParams: SubnationalQueryParameters = {
      subnational_id: subnationalId,
      subnational_code: subnationalCode,
      is_active: 1,
    };

    const query: string = `select getSubnationalScopeData(?) as subnational_scope_data;`;

    const rawResponse = (
      await this.query(query, [JSON.stringify(queryParams)])
    )?.[0];
    subnationalScopeDtos = rawResponse?.subnational_scope_data;

    return subnationalScopeDtos[0] ?? null;
  }
}
