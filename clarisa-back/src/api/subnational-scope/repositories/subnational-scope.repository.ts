import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SubnationalScope } from '../entities/subnational-scope.entity';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { SubnationalScopeDto } from '../dto/subnational-scope.dto';
import { BadParamsError } from '../../../shared/errors/bad-params.error';
import { bigintSerializer } from '../../../shared/mappers/bigint-serializer';
import { ElasticFindEntity } from '../../../integration/opensearch/dto/elastic-find-entity.dto';
import { OpenSearchSubnationalDto } from '../../../integration/opensearch/subnational/dto/open-search-subnational.dto';
import { SubnationalQueryParameters } from '../dto/subnational-query-parameters.dto';

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
    offset?: number,
    limit?: number,
  ): Promise<SubnationalScopeDto[]> {
    let subnationalScopeDtos: SubnationalScopeDto[] = [];
    let queryParams: SubnationalQueryParameters = {
      country_id: countryId,
      country_iso2: countryIsoAlpha2,
      offset: BigInt(offset ?? 0),
      // 18446744073709551615 is the maximum value for a bigint in MySQL
      limit: BigInt(limit ?? '18446744073709551615'),
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
        throw new BadParamsError(this.target.toString(), 'option', option);
    }

    const query: string = `select getSubnationalScopeData(?) as subnational_scope_data;`;

    const rawResponse = (
      await this.query(query, [JSON.stringify(queryParams, bigintSerializer)])
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

    if (!subnationalScopeDtos?.length) {
      throw Error();
    }

    return subnationalScopeDtos[0];
  }
}
