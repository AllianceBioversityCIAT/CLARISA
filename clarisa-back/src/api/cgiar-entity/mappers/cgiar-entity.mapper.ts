import { Injectable } from '@nestjs/common';
import { CgiarEntity } from '../entities/cgiar-entity.entity';
import { CgiarEntityDtoV1 } from '../dto/cgiar-entity.v1.dto';
import { CgiarEntityTypeMapper } from '../../cgiar-entity-type/mappers/cgiar-entity-type.mapper';
import { BasicDtoMapper } from '../../../shared/mappers/basic-dto.mapper';
import { CgiarEntityDtoV2 } from '../dto/cgiar-entity.v2.dto';
import { Portfolio } from '../../portfolio/entities/portfolio.entity';

@Injectable()
export class CgiarEntityMapper {
  constructor(
    private readonly _cgiarEntityTypeMapper: CgiarEntityTypeMapper,
    private readonly _basicCEDtoMapper: BasicDtoMapper<CgiarEntity>,
    private readonly _basicPDtoMapper: BasicDtoMapper<Portfolio>,
  ) {}
  public classToDtoV1(
    cgiarEntity: CgiarEntity,
    showIsActive: boolean = false,
  ): CgiarEntityDtoV1 {
    const cgiarEntityDtoV1: CgiarEntityDtoV1 = new CgiarEntityDtoV1();

    Object.assign(
      cgiarEntityDtoV1,
      this._basicCEDtoMapper.classToDto(cgiarEntity, showIsActive),
    );

    cgiarEntityDtoV1.acronym = cgiarEntity.acronym;
    cgiarEntityDtoV1.financial_code = cgiarEntity.financial_code;
    cgiarEntityDtoV1.institutionId = cgiarEntity.institution_id;

    if (cgiarEntity.cgiar_entity_type_object) {
      cgiarEntityDtoV1.cgiarEntityTypeDTO =
        this._cgiarEntityTypeMapper.classToDtoV1(
          cgiarEntity.cgiar_entity_type_object,
        );
    }

    return cgiarEntityDtoV1;
  }

  public classListToDtoV1List(
    cgiarEntities: CgiarEntity[],
    showIsActive: boolean = false,
  ): CgiarEntityDtoV1[] {
    return cgiarEntities.map((cgiarEntity) =>
      this.classToDtoV1(cgiarEntity, showIsActive),
    );
  }

  public classToDtoV2(
    cgiarEntity: CgiarEntity,
    showIsActive: boolean = false,
  ): CgiarEntityDtoV2 {
    const cgiarEntityDtoV2: CgiarEntityDtoV2 = new CgiarEntityDtoV2();

    Object.assign(
      cgiarEntityDtoV2,
      this._basicCEDtoMapper.classToDto(cgiarEntity, showIsActive),
    );

    cgiarEntityDtoV2.acronym = cgiarEntity.acronym;
    cgiarEntityDtoV2.short_name = cgiarEntity.short_name;
    cgiarEntityDtoV2.acronym = cgiarEntity.acronym;
    cgiarEntityDtoV2.start_date = cgiarEntity.start_date?.getFullYear();
    cgiarEntityDtoV2.end_date = cgiarEntity.end_date?.getFullYear();
    cgiarEntityDtoV2.level = cgiarEntity.level;

    if (cgiarEntity.cgiar_entity_type_object) {
      cgiarEntityDtoV2.entity_type = this._cgiarEntityTypeMapper.classToDtoV1(
        cgiarEntity.cgiar_entity_type_object,
      );
    }

    if (cgiarEntity.parent_object) {
      cgiarEntityDtoV2.parent = this.classToDtoV1(
        cgiarEntity.parent_object,
        showIsActive,
      );
    }

    if (cgiarEntity.portfolio_object) {
      cgiarEntityDtoV2.portfolio = this._basicPDtoMapper.classToDto(
        cgiarEntity.portfolio_object,
      );
    }

    return cgiarEntityDtoV2;
  }

  public classListToDtoV2List(
    cgiarEntities: CgiarEntity[],
    showIsActive: boolean = false,
  ): CgiarEntityDtoV2[] {
    return cgiarEntities.map((cgiarEntity) =>
      this.classToDtoV2(cgiarEntity, showIsActive),
    );
  }
}
