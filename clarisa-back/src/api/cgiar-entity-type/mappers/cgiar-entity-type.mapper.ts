import { Injectable } from '@nestjs/common';
import { CgiarEntityType } from '../entities/cgiar-entity-type.entity';
import { BasicDto } from '../../../shared/entities/dtos/basic-dto';
import { BasicDtoMapper } from '../../../shared/mappers/basic-dto.mapper';
import { CgiarEntityTypeDtoV2 } from '../dto/cgiar-entity-type.v2.dto';
import { FundingSource } from '../../funding-source/entities/funding-source.entity';
import { Portfolio } from '../../portfolio/entities/portfolio.entity';

@Injectable()
export class CgiarEntityTypeMapper {
  constructor(
    private readonly _basicCETDtoMapper: BasicDtoMapper<CgiarEntityType>,
    private readonly _basicFSDtoMapper: BasicDtoMapper<FundingSource>,
    private readonly _basicPDtoMapper: BasicDtoMapper<Portfolio>,
  ) {}
  public classToDtoV1(
    cgiarEntityType: CgiarEntityType,
    showIsActive: boolean = false,
  ): BasicDto {
    return this._basicCETDtoMapper.classToDto(cgiarEntityType, showIsActive);
  }

  public classListToDtoV1List(
    cgiarEntityTypes: CgiarEntityType[],
    showIsActive: boolean = false,
  ): BasicDto[] {
    return this._basicCETDtoMapper.classListToDtoList(
      cgiarEntityTypes,
      showIsActive,
    );
  }

  public classToDtoV2(
    cgiarEntityType: CgiarEntityType,
    showIsActive: boolean = false,
  ): CgiarEntityTypeDtoV2 {
    const cgiarEntityTypeDtoV2: CgiarEntityTypeDtoV2 =
      new CgiarEntityTypeDtoV2();

    Object.assign(
      cgiarEntityTypeDtoV2,
      this._basicCETDtoMapper.classToDto(cgiarEntityType, showIsActive),
    );

    cgiarEntityTypeDtoV2.prefix = cgiarEntityType.prefix;
    cgiarEntityTypeDtoV2.level = cgiarEntityType.level;
    cgiarEntityTypeDtoV2.definition = cgiarEntityType.definition;

    if (cgiarEntityType.parent_object) {
      cgiarEntityTypeDtoV2.parent = this.classToDtoV1(
        cgiarEntityType.parent_object,
        showIsActive,
      );
    }

    if (cgiarEntityType.funding_source_object) {
      cgiarEntityTypeDtoV2.funding_source = this._basicFSDtoMapper.classToDto(
        cgiarEntityType.funding_source_object,
        showIsActive,
      );
    }

    if (cgiarEntityType.portfolio_object) {
      cgiarEntityTypeDtoV2.portfolio = this._basicPDtoMapper.classToDto(
        cgiarEntityType.portfolio_object,
        showIsActive,
      );
    }

    return cgiarEntityTypeDtoV2;
  }

  public classListToDtoV2List(
    cgiarEntityTypes: CgiarEntityType[],
    showIsActive: boolean = false,
  ): CgiarEntityTypeDtoV2[] {
    return cgiarEntityTypes.map((cgiarEntityType) =>
      this.classToDtoV2(cgiarEntityType, showIsActive),
    );
  }
}
