import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { InstitutionRepository } from '../institution/repositories/institution.repository';
import { InstitutionDictionaryDto } from './dto/institution-dictionary.dto';
import { UpdateInstitutionDictionaryDto } from './dto/update-institution-dictionary.dto';
import { InstitutionDictionaryRepository } from './repositories/institution-dictionary.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class InstitutionDictionaryService {
  constructor(
    private _institutionRepository: InstitutionRepository,
    private _institutionDictionaryRepository: InstitutionDictionaryRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    offset: number,
    limit: number,
  ): Promise<InstitutionDictionaryDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._institutionDictionaryRepository.target.toString(),
        'option',
        option,
      );
    }

    return this._institutionRepository.findInstitutionSourceEntries(
      option,
      undefined,
      offset,
      limit,
    );
  }

  async findOne(id: number): Promise<InstitutionDictionaryDto> {
    return this._institutionRepository
      .findInstitutionSourceEntriesById(id)
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._institutionDictionaryRepository.target.toString(),
          id,
        );
      });
  }

  async update(
    updateInstitutionDictionaryDto: UpdateInstitutionDictionaryDto[],
  ) {
    return await this._institutionDictionaryRepository.save(
      updateInstitutionDictionaryDto,
    );
  }
}
