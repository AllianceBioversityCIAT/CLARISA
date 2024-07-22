import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateBusinessCategoryDto } from './dto/update-business-category.dto';
import { BusinessCategory } from './entities/business-category.entity';
import { BusinessCategoryRepository } from './repositories/business-category.repository';
import { FindOptionsSelect } from 'typeorm';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';

@Injectable()
export class BusinessCategoryService {
  constructor(
    private businessCategoriesRepository: BusinessCategoryRepository,
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
        return await this.businessCategoriesRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.businessCategoriesRepository.find({
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

  async findOne(id: number): Promise<BasicDtoV1> {
    return await this.businessCategoriesRepository.findOne({
      where: { id, auditableFields: { is_active: true } },
      select: this._select,
    });
  }

  async update(updateBusinessCategoryDto: UpdateBusinessCategoryDto[]) {
    return await this.businessCategoriesRepository.save(
      updateBusinessCategoryDto,
    );
  }
}
