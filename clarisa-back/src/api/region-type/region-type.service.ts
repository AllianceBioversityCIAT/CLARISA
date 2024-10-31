import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateRegionTypeDto } from './dto/update-region-type.dto';
import { RegionTypeRepository } from './repositories/region-type.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class RegionTypeService {
  constructor(private _regionTypesRepository: RegionTypeRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDtoV1[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this._regionTypesRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this._regionTypesRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._regionTypesRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<BasicDtoV1> {
    return this._regionTypesRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._regionTypesRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateRegionTypeDto: UpdateRegionTypeDto[]) {
    return await this._regionTypesRepository.save(updateRegionTypeDto);
  }
}
