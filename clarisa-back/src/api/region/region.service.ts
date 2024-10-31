import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { RegionTypeEnum } from '../../shared/entities/enums/region-types';
import { RegionDto } from './dto/region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { RegionRepository } from './repositories/region.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class RegionService {
  constructor(private _regionsRepository: RegionRepository) {}

  async findAll(
    regionType: RegionTypeEnum,
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<RegionDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._regionsRepository.target.toString(),
        'option',
        option,
      );
    }

    return this._regionsRepository.findRegions(regionType, option);
  }

  async findOne(id: number): Promise<RegionDto> {
    return this._regionsRepository.findRegionById(id).catch(() => {
      throw ClarisaEntityNotFoundError.forId(
        this._regionsRepository.target.toString(),
        id,
      );
    });
  }

  async update(updateRegionDto: UpdateRegionDto[]) {
    return await this._regionsRepository.save(updateRegionDto);
  }
}
