import { Injectable } from '@nestjs/common';
import { LanguageRepository } from './language.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Language } from './entities/language.entity';

@Injectable()
export class LanguageService {
  constructor(private languagesRepository: LanguageRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<Language[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.languagesRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.languagesRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<Language> {
    return await this.languagesRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }
}
