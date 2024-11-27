import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Language } from './entities/language.entity';
import { LanguageRepository } from './repositories/language.repository';
import { FindOptionsSelect } from 'typeorm';
import { LanguageDto } from './dto/language.dto';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
import { BadParamsError } from '../../shared/errors/bad-params.error';

@Injectable()
export class LanguageService {
  constructor(private _languagesRepository: LanguageRepository) {}
  private readonly _select: FindOptionsSelect<Language> = {
    id: true,
    name: true,
    iso_alpha_2: true,
    iso_alpha_3: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<LanguageDto[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._languagesRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._languagesRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          select: this._select,
        });
      default:
        throw new BadParamsError(
          this._languagesRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<LanguageDto> {
    return this._languagesRepository
      .findOneOrFail({
        where: { id, auditableFields: { is_active: true } },
        select: this._select,
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._languagesRepository.target.toString(),
          id,
        );
      });
  }
}
