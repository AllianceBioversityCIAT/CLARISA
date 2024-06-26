import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { RegionTypeEnum } from '../../shared/entities/enums/region-types';
import { RegionDto } from './dto/region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { Region } from './entities/region.entity';
import { RegionRepository } from './repositories/region.repository';

@Injectable()
export class RegionService {
  constructor(private regionsRepository: RegionRepository) {}

  async findAll(
    regionType: RegionTypeEnum,
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<RegionDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this.regionsRepository.findRegionsByType(regionType, option);
  }

  async findOne(id: number): Promise<Region> {
    return await this.regionsRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(updateRegionDto: UpdateRegionDto[]) {
    return await this.regionsRepository.save(updateRegionDto);
  }
}
