import { Injectable } from '@nestjs/common';
import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { Glossary } from './entities/glossary.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { GlossaryRepository } from './repositories/glossary.repository';
@Injectable()
export class GlossaryService {
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  constructor(private glossaryRepository: GlossaryRepository) {}

  findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    onlyDashboard = false,
  ): Promise<Glossary[]> {
    let whereClause: FindOptionsWhere<Glossary> = {};
    const orderClause: FindOptionsOrder<Glossary> = {
      title: 'ASC',
    };

    if (onlyDashboard) {
      whereClause = {
        ...whereClause,
        show_in_dashboard: true,
      };
    }

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this.glossaryRepository.find({
          where: whereClause,
          order: orderClause,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          ...whereClause,
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
        return this.glossaryRepository.find({
          where: whereClause,
          order: orderClause,
        });
      default:
        throw Error('?!');
    }
  }

  findOne(id: number): Promise<Glossary | null> {
    return this.glossaryRepository.findOneBy({ id });
  }
}
