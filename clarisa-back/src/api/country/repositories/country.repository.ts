import { Injectable } from '@nestjs/common';
import { DataSource, FindManyOptions, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { CountryDto } from '../dto/country.dto';
import { Country } from '../entities/country.entity';
import { ElasticFindEntity } from '../../../integration/opensearch/dto/elastic-find-entity.dto';
import { OpenSearchCountryDto } from '../../../integration/opensearch/country/dto/open-search-country.dto';

@Injectable()
export class CountryRepository
  extends Repository<Country>
  implements ElasticFindEntity<OpenSearchCountryDto>
{
  private readonly _findCriteria: FindManyOptions<Country> = {
    relations: {
      geoposition_object: true,
    },
  };
  constructor(private dataSource: DataSource) {
    super(Country, dataSource.createEntityManager());
  }

  async findDataForOpenSearch(
    option: FindAllOptions,
    ids?: number[],
  ): Promise<OpenSearchCountryDto[]> {
    const queryBuilder = this.createQueryBuilder('country') // Alias de Country
      .select([
        'country.id',
        'country.name',
        'country.iso_alpha_2',
        'country.iso_alpha_3',
        'country.iso_numeric',
        'country.geoposition_id',
      ])
      .leftJoin('country.subnational_scope_array', 'subnational')
      .addSelect([
        'subnational.id',
        'subnational.code',
        'subnational.name',
        'subnational.local_name',
        'subnational.romanization_system_name',
        'subnational.country_id',
        'subnational.iso_language_id',
        'subnational.iso_subnational_category_id',
      ]);

    if (option !== FindAllOptions.SHOW_ALL) {
      queryBuilder.andWhere('country.auditableFields.is_active = :isActive', {
        isActive: option === FindAllOptions.SHOW_ONLY_ACTIVE,
      });
    }

    if (ids && ids.length > 0) {
      queryBuilder.andWhere('country.id IN (:...ids)', { ids });
    }

    return queryBuilder.getMany() as unknown as Promise<OpenSearchCountryDto[]>;
  }

  async findAllCountries(option: FindAllOptions): Promise<CountryDto[]> {
    return this._getCountryResults(option);
  }

  async findCountryByIsoCode(isoCode: number) {
    return this._getCountryResults(FindAllOptions.SHOW_ONLY_ACTIVE, isoCode);
  }

  private _getCountryResults(option: FindAllOptions, id?: number) {
    const query = `
      SELECT 
        c.iso_numeric code, 
        c.iso_alpha_2 isoAlpha2, 
        c.iso_alpha_3 isoAlpha3, 
        c.name,
        json_object(
            'um49Code', r.iso_numeric,
            'name', r.name,
            'parentRegion', json_object(
                'name', pr.name,
                'um49Code', pr.iso_numeric
            )
        ) AS regionDTO,
        json_object (
            'latitude', g.latitude,
            'longitude', g.longitude
        ) AS locationDTO
      FROM countries c
      LEFT JOIN country_regions cr ON cr.country_id = c.id
      LEFT JOIN regions r ON cr.region_id = r.id AND r.region_type_id = 2
      LEFT JOIN regions pr ON r.parent_id = pr.id
      LEFT JOIN geopositions g ON c.geoposition_id = g.id
      WHERE r.id IS NOT NULL
      ${option !== FindAllOptions.SHOW_ALL ? `AND c.is_active = ${option === FindAllOptions.SHOW_ONLY_ACTIVE}` : ''}
      ${id ? `AND c.iso_numeric = ${id}` : ''}
      ORDER BY c.id;
    `;

    return this.query(query) as Promise<CountryDto[]>;
  }
}
