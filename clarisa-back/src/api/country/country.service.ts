import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { CountryDto } from './dto/country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CountryRepository } from './repositories/country.repository';

@Injectable()
export class CountryService {
  constructor(private countriesRepository: CountryRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<CountryDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this.countriesRepository.findAllCountries(option);
  }

  async findOne(isoCode: number): Promise<CountryDto> {
    const result = await this.countriesRepository.findCountryByIsoCode(isoCode);

    return result.length === 1 ? result[0] : null;
  }

  async update(updateCountryDto: UpdateCountryDto[]) {
    return await this.countriesRepository.save(updateCountryDto);
  }
}
