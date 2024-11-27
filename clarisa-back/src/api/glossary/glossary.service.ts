import { Injectable } from '@nestjs/common';
import { UpdateGlossaryDto } from './dto/update-glossary.dto';
import { FindOptionsOrder, FindOptionsSelect, FindOptionsWhere } from 'typeorm';
import { Glossary } from './entities/glossary.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { GlossaryRepository } from './repositories/glossary.repository';
import { GlossaryDto } from './dto/glossary.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
@Injectable()
export class GlossaryService {
  constructor(private _glossaryRepository: GlossaryRepository) {}
  private readonly _select: FindOptionsSelect<Glossary> = {
    id: true,
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
        return this._glossaryRepository.find({
          where: whereClause,
          order: orderClause,
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          ...whereClause,
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
        return this._glossaryRepository.find({
          where: whereClause,
          order: orderClause,
          select: this._select,
        });
      default:
        throw new BadParamsError(
          this._glossaryRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  findOne(id: number) {
    return this._glossaryRepository
      .findOneOrFail({
        where: { id, auditableFields: { is_active: true } },
        select: this._select,
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._glossaryRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateGlossary: UpdateGlossaryDto[]): Promise<Glossary[]> {
    return await this._glossaryRepository.save(updateGlossary);
  }

  async getWithPagination(offset?: number, limit = 10) {
    const [items, count] = await this._glossaryRepository.findAndCount({
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
