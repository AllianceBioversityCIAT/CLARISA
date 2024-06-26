import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { CountryDto } from './dto/country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { Country } from './entities/country.entity';
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

  async findOne(id: number): Promise<Country> {
    return await this.countriesRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(updateCountryDto: UpdateCountryDto[]) {
    return await this.countriesRepository.save(updateCountryDto);
  }
}
