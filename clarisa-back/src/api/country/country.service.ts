import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { CountryDto } from './dto/country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CountryRepository } from './repositories/country.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class CountryService {
  constructor(private _countriesRepository: CountryRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<CountryDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._countriesRepository.target.toString(),
        'option',
        option,
      );
    }

    return this._countriesRepository.findAllCountries(option);
  }

  async findOne(isoCode: number): Promise<CountryDto> {
    return this._countriesRepository
      .findCountryByIsoCode(isoCode)
      .then((country) => {
        if (!country?.length) {
          throw ClarisaEntityNotFoundError.forSingleParam(
            this._countriesRepository.target.toString(),
            'isoCode',
            isoCode,
          );
        }

        return country[0];
      });
  }

  async update(updateCountryDto: UpdateCountryDto[]) {
    return await this._countriesRepository.save(updateCountryDto);
  }
}
