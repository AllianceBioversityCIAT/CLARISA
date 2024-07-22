import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { InstitutionRepository } from '../institution/repositories/institution.repository';
import { InstitutionDictionaryDto } from './dto/institution-dictionary.dto';
import { UpdateInstitutionDictionaryDto } from './dto/update-institution-dictionary.dto';
import { InstitutionDictionaryRepository } from './repositories/institution-dictionary.repository';

@Injectable()
export class InstitutionDictionaryService {
  constructor(
    private institutionRepository: InstitutionRepository,
    private institutionDictionaryRepository: InstitutionDictionaryRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<InstitutionDictionaryDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this.institutionRepository.findInstitutionSourceEntries(option);
  }

  async findOne(id: number): Promise<InstitutionDictionaryDto> {
    const result =
      await this.institutionRepository.findInstitutionSourceEntries(
        FindAllOptions.SHOW_ONLY_ACTIVE,
        id,
      );
    return result.length === 1 ? result[0] : null;
  }

  async update(
    updateInstitutionDictionaryDto: UpdateInstitutionDictionaryDto[],
  ) {
    return await this.institutionDictionaryRepository.save(
      updateInstitutionDictionaryDto,
    );
  }
}
