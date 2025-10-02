import { Injectable } from '@nestjs/common';
import { CgiarEntityType } from '../entities/cgiar-entity-type.entity';
import { BasicDto } from '../../../shared/entities/dtos/basic-dto';
import { BasicDtoMapper } from '../../../shared/mappers/basic-dto.mapper';
import { CgiarEntityTypeDtoV2 } from '../dto/cgiar-entity-type.v2.dto';
import { FundingSource } from '../../funding-source/entities/funding-source.entity';
import { Portfolio } from '../../portfolio/entities/portfolio.entity';
import { CgiarEntityTypeDtoV1 } from '../dto/cgiar-entity-type.v1.dto';

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

  public entityTypeListToDtoV1List(
    cgiarEntityTypes: CgiarEntityType[],
    showIsActive: boolean = false,
  ): CgiarEntityTypeDtoV1[] {
    return cgiarEntityTypes.map((entity) => this.entityTypeToDtoV1(entity));
  }

  public entityTypeToDtoV1(entity: CgiarEntityType): CgiarEntityTypeDtoV1 {
    const dto = new CgiarEntityTypeDtoV1();
    dto.code = entity.id; // o entity.code si existe
    dto.name = entity.name;
    dto.portfolio = entity.portfolio_object?.name ?? '';
    return dto;
  }
}
