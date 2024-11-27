import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateBusinessCategoryDto } from './dto/update-business-category.dto';
import { BusinessCategoryRepository } from './repositories/business-category.repository';
import { FindOptionsSelect } from 'typeorm';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
import { BusinessCategory } from './entities/business-category.entity';

@Injectable()
export class BusinessCategoryService {
  constructor(
    private _businessCategoriesRepository: BusinessCategoryRepository,
  ) {}
  private readonly _select: FindOptionsSelect<BusinessCategory> = {
    id: true,
    name: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDtoV1[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._businessCategoriesRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._businessCategoriesRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          select: this._select,
        });
      default:
        throw new BadParamsError(
          this._businessCategoriesRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<BasicDtoV1> {
    return await this._businessCategoriesRepository
      .findOneOrFail({
        where: { id, auditableFields: { is_active: true } },
        select: this._select,
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._businessCategoriesRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateBusinessCategoryDto: UpdateBusinessCategoryDto[]) {
    return await this._businessCategoriesRepository.save(
      updateBusinessCategoryDto,
    );
  }
}
