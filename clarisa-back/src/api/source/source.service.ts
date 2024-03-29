import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Source } from './entities/source.entity';
import { SourceRepository } from './repositories/source.repository';

@Injectable()
export class SourceService {
  constructor(private sourceRepository: SourceRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<Source[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.sourceRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.sourceRepository.find({
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

  async findOne(id: number): Promise<Source> {
    return await this.sourceRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }
}
