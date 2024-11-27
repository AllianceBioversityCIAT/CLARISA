import { Injectable } from '@nestjs/common';
import { DataSource, FindManyOptions, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { CountryDto } from '../dto/country.dto';
import { Country } from '../entities/country.entity';

@Injectable()
export class CountryRepository extends Repository<Country> {
  private readonly _findCriteria: FindManyOptions<Country> = {
    relations: {
      geoposition_object: true,
    },
  };
  constructor(private dataSource: DataSource) {
    super(Country, dataSource.createEntityManager());
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
