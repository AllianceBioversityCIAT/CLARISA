import { Injectable } from '@nestjs/common';
import { DataSource, FindManyOptions, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { ParentRegionDto } from '../../region/dto/parent-region.dto';
import { SimpleRegionDto } from '../../region/dto/simple-region.dto';
import { Region } from '../../region/entities/region.entity';
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
    const queryBuilder = this.createQueryBuilder('country')
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
    const countries: Country[] = await this.find({
      ...this._findCriteria,
      where:
        option !== FindAllOptions.SHOW_ALL
          ? {
              auditableFields: {
                is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
              },
            }
          : undefined,
    });

    const countryDtos: CountryDto[] = [];

    await Promise.all(
      countries.map(async (c) => {
        let region: Region = await this.query(
          `
        select r.* from regions r
        join country_regions cr on cr.region_id = r.id
        join countries c on cr.country_id = c.id
        where c.id = ? and r.region_type_id = 2;
      `,
          [c.id],
        );
        region =
          ((<unknown>region) as Region[]).length === 1 ? region[0] : undefined;

        let parentRegion: Region = await this.query(
          `
        select r.* from regions r
        where r.id = ?;
      `,
          [region?.parent_id ?? 0],
        );
        parentRegion =
          ((<unknown>parentRegion) as Region[]).length === 1
            ? parentRegion[0]
            : undefined;

        const countryDto: CountryDto = new CountryDto();
        let regionDto: SimpleRegionDto = null;
        let parentRegionDto: ParentRegionDto = null;

        if (region) {
          if (parentRegion) {
            parentRegionDto = new ParentRegionDto();
            parentRegionDto.name = parentRegion.name;
            parentRegionDto.um49Code = parentRegion.iso_numeric;
          }

          regionDto = new SimpleRegionDto();
          regionDto.name = region.name;
          regionDto.um49Code = region.iso_numeric;
          regionDto.parentRegion = parentRegionDto;
        }

        if (c.geoposition_object) {
          countryDto.locationDTO = {
            latitude: c.geoposition_object.latitude,
            longitude: c.geoposition_object.longitude,
          };
        }

        countryDto.code = c.iso_numeric;
        countryDto.isoAlpha2 = c.iso_alpha_2;
        countryDto.isoAlpha3 = c.iso_alpha_3;
        countryDto.name = c.name;
        countryDto.regionDTO = regionDto;

        countryDtos.push(countryDto);
      }),
    );

    return countryDtos;
  }
}
