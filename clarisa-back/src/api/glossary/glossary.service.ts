import { Injectable } from '@nestjs/common';
import { UpdateGlossaryDto } from './dto/update-glossary.dto';
import {
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsWhere,
} from 'typeorm';
import { Glossary } from './entities/glossary.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { GlossaryRepository } from './repositories/glossary.repository';
@Injectable()
export class GlossaryService {
  constructor(private glossaryRepository: GlossaryRepository) {}

  findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    onlyDashboard = false,
  ): Promise<Glossary[]> {
    let whereClause: FindOptionsWhere<Glossary> = {};
    const orderClause: FindOptionsOrder<Glossary> = {
      title: 'ASC',
    };
    const relationsClause: FindOptionsRelations<Glossary> = {
      glossary_portfolio_array: { portfolio_object: true },
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
          relations: relationsClause,
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
          relations: relationsClause,
        });
      default:
        throw Error('?!');
    }
  }

  findOne(id: number) {
    return this.glossaryRepository.findOne({
      where: { id },
      relations: {
        glossary_portfolio_array: { portfolio_object: true },
      },
    });
  }

  async update(updateGlossary: UpdateGlossaryDto[]): Promise<Glossary[]> {
    return await this.glossaryRepository.save(updateGlossary);
  }

  async getRolesPagination(offset?: number, limit = 10) {
    const [items, count] = await this.glossaryRepository.findAndCount({
      order: {
        id: 'ASC',
      },
      skip: offset,
      take: limit,
    });

    return {
      items,
      count,
    };
  }
}
