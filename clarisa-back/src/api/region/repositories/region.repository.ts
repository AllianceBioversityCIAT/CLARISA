import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { RegionTypeEnum } from '../../../shared/entities/enums/region-types';
import { UnRegionDto } from '../dto/un-region.dto';
import { Region } from '../entities/region.entity';
import { CgiarRegionDto } from '../dto/cgiar-region.dto';

@Injectable()
export class RegionRepository extends Repository<Region> {
  constructor(private dataSource: DataSource) {
    super(Region, dataSource.createEntityManager());
  }

  private _getQueryForRegionType(
    regionType: RegionTypeEnum,
    option: FindAllOptions,
    regionId?: number,
  ) {
    let where: string = `where r.is_active and r.region_type_id = ?`;

    if (option !== FindAllOptions.SHOW_ALL) {
      where += ` and r.is_active = ?`;
    }

    switch (regionType) {
      case RegionTypeEnum.UN_REGION:
        if (regionId) {
          where += ` and r.iso_numeric = ?`;
        }

        return `
          select r.iso_numeric as um49Code, r.name,
            if(r.parent_id is null, null, json_object(
              "um49Code", parent.iso_numeric,
              "name", parent.name
            )) as parentRegion
          from regions r
          left join regions parent on r.parent_id = parent.id
          ${where}
        `;
      case RegionTypeEnum.CGIAR_REGION:
        if (regionId) {
          where += ` and r.id = ?`;
        }

        return `
          select r.id as code, r.name, r.acronym, json_arrayagg(json_object(
            "code", c.iso_numeric,
            "isoAlpha2", c.iso_alpha_2,
            "isoAlpha3", c.iso_alpha_3,
            "name", c.name
          )) as countries
          from regions r
          left join country_regions cr on cr.region_id = r.id and cr.is_active
          left join countries c on cr.country_id = c.id and c.is_active
          ${where}
          group by r.id, r.name, r.acronym
        `;
    }
  }

  async findRegions(
    regionType: string | RegionTypeEnum,
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<(UnRegionDto | CgiarRegionDto)[]> {
    const selectedRegionType =
      typeof regionType === 'string'
        ? RegionTypeEnum.getfromName(regionType)
        : regionType;
    const whereValues: (number | boolean)[] = [selectedRegionType.id];

    if (option !== FindAllOptions.SHOW_ALL) {
      whereValues.push(option === FindAllOptions.SHOW_ONLY_ACTIVE);
    }

    return this.query(
      this._getQueryForRegionType(selectedRegionType, option),
      whereValues,
    );
  }

  async findRegionByIdAndType(
    regionId: number,
    regionType: string | RegionTypeEnum,
  ): Promise<UnRegionDto | CgiarRegionDto> {
    const selectedRegionType =
      typeof regionType === 'string'
        ? RegionTypeEnum.getfromName(regionType)
        : regionType;

    return this.query(
      this._getQueryForRegionType(
        selectedRegionType,
        FindAllOptions.SHOW_ONLY_ACTIVE,
        regionId,
      ),
      [selectedRegionType.id, true, regionId],
    ).then((regions) => {
      if (!regions?.length) {
        throw Error();
      }

      return regions[0];
    });
  }
}
