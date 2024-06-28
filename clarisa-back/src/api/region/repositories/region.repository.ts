import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { RegionTypeEnum } from '../../../shared/entities/enums/region-types';
import { SimpleCountryDto } from '../../country/dto/simple-country.dto';
import { ParentRegionDto } from '../dto/parent-region.dto';
import { RegionDto } from '../dto/region.dto';
import { Region } from '../entities/region.entity';

@Injectable()
export class RegionRepository extends Repository<Region> {
  constructor(private dataSource: DataSource) {
    super(Region, dataSource.createEntityManager());
  }

  async findRegionsByType(
    regionType: RegionTypeEnum,
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<RegionDto[]> {
    let whereClause: FindOptionsWhere<Region> = {
      region_type_id: regionType,
    };
    switch (option) {
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          ...whereClause,
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
    }
    const regions: Region[] = await this.find({
      where: whereClause,
      relations: {
        parent_object: true,
        country_region_array: {
          country_object: true,
        },
        region_type_object: true,
      },
    });
    const regionDtos: RegionDto[] = [];

    await Promise.all(
      regions.map(async (r) => {
        const regionDto: RegionDto = new RegionDto();
        let parentRegionDto: ParentRegionDto = null;

        if (regionType === RegionTypeEnum.UN_REGION) {
          regionDto.um49Code = r.iso_numeric;
        } else if (regionType === RegionTypeEnum.CGIAR_REGION) {
          regionDto.code = r.iso_numeric;
        }

        regionDto.name = r.name;
        if (regionType !== RegionTypeEnum.UN_REGION) {
          regionDto.acronym = r.acronym;
        }

        if (r.parent_object) {
          parentRegionDto = new ParentRegionDto();
          parentRegionDto.name = r.parent_object.name;
          parentRegionDto.um49Code = r.parent_object.iso_numeric;
          regionDto.parentRegion = parentRegionDto;
        }

        if (regionType === RegionTypeEnum.CGIAR_REGION) {
          regionDto.countries = r.country_region_array.map((c) => {
            const countryDto: SimpleCountryDto = new SimpleCountryDto();

            countryDto.code = c.country_object.iso_numeric;
            countryDto.isoAlpha2 = c.country_object.iso_alpha_2;
            countryDto.isoAlpha3 = c.country_object.iso_alpha_3;
            countryDto.name = c.country_object.name;

            return countryDto;
          });
        }

        regionDtos.push(regionDto);
      }),
    );

    return regionDtos;
  }
}
