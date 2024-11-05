import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { RegionTypeEnum } from '../../shared/entities/enums/region-types';
import { UnRegionDto } from './dto/un-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { RegionRepository } from './repositories/region.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
import { CgiarRegionDto } from './dto/cgiar-region.dto';

@Injectable()
export class RegionService {
  constructor(private _regionsRepository: RegionRepository) {}

  async findRegions(
    regionType: string | RegionTypeEnum,
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<(UnRegionDto | CgiarRegionDto)[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._regionsRepository.target.toString(),
        'option',
        option,
      );
    }

    if (
      !regionType ||
      (typeof regionType === 'string' &&
        !RegionTypeEnum.getfromName(regionType))
    ) {
      throw new BadParamsError(
        this._regionsRepository.target.toString(),
        'type',
        regionType,
      );
    }

    return this._regionsRepository.findRegions(regionType, option);
  }

  async findRegionByIdAndType(
    id: number,
    regionType: string | RegionTypeEnum,
  ): Promise<UnRegionDto | CgiarRegionDto> {
    if (
      !regionType ||
      (typeof regionType === 'string' &&
        !RegionTypeEnum.getfromName(regionType))
    ) {
      throw new BadParamsError(
        this._regionsRepository.target.toString(),
        'type',
        regionType,
      );
    }

    return this._regionsRepository
      .findRegionByIdAndType(id, regionType)
      .catch(() => {
        throw ClarisaEntityNotFoundError.forMultipleParams(
          this._regionsRepository.target.toString(),
          { id, type: regionType.toString() },
        );
      });
  }

  async update(updateRegionDto: UpdateRegionDto[]) {
    return await this._regionsRepository.save(updateRegionDto);
  }
}
