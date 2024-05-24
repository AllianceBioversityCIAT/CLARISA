import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateBusinessCategoryDto } from './dto/update-business-category.dto';
import { BusinessCategoryRepository } from './repositories/business-category.repository';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic-dto.v1';

@Injectable()
export class BusinessCategoryService {
  constructor(
    private businessCategoriesRepository: BusinessCategoryRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDtoV1[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this.businessCategoriesRepository.find() as Promise<
          BasicDtoV1[]
        >;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this.businessCategoriesRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        }) as Promise<BasicDtoV1[]>;
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<BasicDtoV1> {
    return this.businessCategoriesRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(updateBusinessCategoryDto: UpdateBusinessCategoryDto[]) {
    return await this.businessCategoriesRepository.save(
      updateBusinessCategoryDto,
    );
  }
}
