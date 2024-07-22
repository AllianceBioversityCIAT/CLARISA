import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Language } from './entities/language.entity';
import { LanguageRepository } from './repositories/language.repository';
import { FindOptionsSelect } from 'typeorm';
import { LanguageDto } from './dto/language.dto';

@Injectable()
export class LanguageService {
  constructor(private languagesRepository: LanguageRepository) {}
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
        return await this.languagesRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.languagesRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          select: this._select,
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<Language> {
    return await this.languagesRepository.findOne({
      where: { id, auditableFields: { is_active: true } },
      select: this._select,
    });
  }
}
