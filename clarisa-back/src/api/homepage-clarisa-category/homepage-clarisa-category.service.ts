import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateHomepageClarisaCategoryDto } from './dto/update-homepage-clarisa-category.dto';
import { HomepageClarisaCategory } from './entities/homepage-clarisa-category.entity';
import { HomepageClarisaCategoryRepository } from './repositories/homepage-clarisa-category.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class HomepageClarisaCategoryService {
  constructor(
    private _homepageClarisaCategoryRepository: HomepageClarisaCategoryRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<HomepageClarisaCategory[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._homepageClarisaCategoryRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._homepageClarisaCategoryRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._homepageClarisaCategoryRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<HomepageClarisaCategory> {
    return this._homepageClarisaCategoryRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._homepageClarisaCategoryRepository.target.toString(),
          id,
        );
      });
  }

  async update(
    updateGeneralDtoList: UpdateHomepageClarisaCategoryDto[],
  ): Promise<HomepageClarisaCategory[]> {
    return await this._homepageClarisaCategoryRepository.save(
      updateGeneralDtoList,
    );
  }
}
