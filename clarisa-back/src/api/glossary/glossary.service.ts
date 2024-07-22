import { Injectable } from '@nestjs/common';
import { UpdateGlossaryDto } from './dto/update-glossary.dto';
import { FindOptionsOrder, FindOptionsSelect, FindOptionsWhere } from 'typeorm';
import { Glossary } from './entities/glossary.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { GlossaryRepository } from './repositories/glossary.repository';
import { GlossaryDto } from './dto/glossary.dto';
@Injectable()
export class GlossaryService {
  constructor(private glossaryRepository: GlossaryRepository) {}
  private readonly _select: FindOptionsSelect<Glossary> = {
    term: true,
    definition: true,
  };

  findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    onlyDashboard = false,
  ): Promise<GlossaryDto[]> {
    let whereClause: FindOptionsWhere<Glossary> = {};
    const orderClause: FindOptionsOrder<Glossary> = {
      term: 'ASC',
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
          select: this._select,
        });
      default:
        throw Error('?!');
    }
  }

  findOne(id: number) {
    return this.glossaryRepository.findOne({
      where: { id },
      select: this._select,
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
      select: this._select,
    });

    return {
      items,
      count,
    };
  }
}
