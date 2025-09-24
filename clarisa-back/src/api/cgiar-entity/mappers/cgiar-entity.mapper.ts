import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { CgiarEntity } from '../entities/cgiar-entity.entity';
import { CgiarEntityDtoV1 } from '../dto/cgiar-entity.v1.dto';
import { CgiarEntityTypeMapper } from '../../cgiar-entity-type/mappers/cgiar-entity-type.mapper';
import {
  BasicDtoEquivalences,
  BasicDtoMapper,
} from '../../../shared/mappers/basic-dto.mapper';
import { CgiarEntityDtoV2 } from '../dto/cgiar-entity.v2.dto';
import { Portfolio } from '../../portfolio/entities/portfolio.entity';
import { GlobalUnitLineage } from '../entities/global-unit-lineage.entity';
import { GlobalUnitLineageDto } from '../dto/global-unit-lineage.dto';

@Injectable()
export class CgiarEntityMapper {
  private readonly _mappedBasicFields: BasicDtoEquivalences<CgiarEntity> = {
    code: 'smo_code',
    name: 'name',
  };

  constructor(
    private readonly _cgiarEntityTypeMapper: CgiarEntityTypeMapper,
    private readonly _basicCEDtoMapper: BasicDtoMapper<CgiarEntity>,
    private readonly _basicPDtoMapper: BasicDtoMapper<Portfolio>,
  ) {}

  private mapLineage(
    lineage: GlobalUnitLineage,
    includeFrom: boolean,
    includeTo: boolean,
  ): GlobalUnitLineageDto {
    const lineageDto = new GlobalUnitLineageDto();
    lineageDto.id = lineage.id;
    lineageDto.relation_type = lineage.relation_type;
    lineageDto.note = lineage.note;
    lineageDto.from_global_unit_id = lineage.from_global_unit_id;
    lineageDto.to_global_unit_id = lineage.to_global_unit_id;

    if (includeFrom && lineage.from_global_unit) {
      lineageDto.from = this._basicCEDtoMapper.classToDto(
        lineage.from_global_unit,
        false,
        this._mappedBasicFields,
      );
    }

    if (includeTo && lineage.to_global_unit) {
      lineageDto.to = this._basicCEDtoMapper.classToDto(
        lineage.to_global_unit,
        false,
        this._mappedBasicFields,
      );
    }

    return lineageDto;
  }
  public classToDtoV1(
    cgiarEntity: CgiarEntity,
    showIsActive: boolean = false,
  ): CgiarEntityDtoV1 {
    const cgiarEntityDtoV1: CgiarEntityDtoV1 = new CgiarEntityDtoV1();

    Object.assign(
      cgiarEntityDtoV1,
      this._basicCEDtoMapper.classToDto(
        cgiarEntity,
        showIsActive,
        this._mappedBasicFields,
      ),
    );

    cgiarEntityDtoV1.acronym = cgiarEntity.acronym;
    cgiarEntityDtoV1.financial_code = cgiarEntity.financial_code;
    cgiarEntityDtoV1.institutionId = cgiarEntity.institution_id;
    cgiarEntityDtoV1.year = cgiarEntity.year;

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
      this._basicCEDtoMapper.classToDto(
        cgiarEntity,
        showIsActive,
        this._mappedBasicFields,
      ),
    );

    cgiarEntityDtoV2.id = cgiarEntity.id;
    cgiarEntityDtoV2.acronym = cgiarEntity.acronym;
    cgiarEntityDtoV2.short_name = cgiarEntity.short_name;
    cgiarEntityDtoV2.acronym = cgiarEntity.acronym;
    cgiarEntityDtoV2.year = cgiarEntity.year;
    cgiarEntityDtoV2.start_date = cgiarEntity.start_date
      ? DateTime.fromJSDate(cgiarEntity.start_date).toFormat('yyyy-MM-dd')
      : null;
    cgiarEntityDtoV2.end_date = cgiarEntity.end_date
      ? DateTime.fromJSDate(cgiarEntity.end_date).toFormat('yyyy-MM-dd')
      : null;
    cgiarEntityDtoV2.level = cgiarEntity.level;

    if (cgiarEntity.cgiar_entity_type_object) {
      cgiarEntityDtoV2.entity_type = this._cgiarEntityTypeMapper.classToDtoV1(
        cgiarEntity.cgiar_entity_type_object,
      );
    }

    if (cgiarEntity.parent_object) {
      cgiarEntityDtoV2.parent = this._basicCEDtoMapper.classToDto(
        cgiarEntity.parent_object,
        showIsActive,
        this._mappedBasicFields,
      );
    }

    if (cgiarEntity.portfolio_object) {
      cgiarEntityDtoV2.portfolio = this._basicPDtoMapper.classToDto(
        cgiarEntity.portfolio_object,
      );
    }

    if (cgiarEntity.outgoing_lineages?.length) {
      cgiarEntityDtoV2.outgoing_lineages = cgiarEntity.outgoing_lineages.map(
        (lineage) => this.mapLineage(lineage, true, true),
      );
    }

    if (cgiarEntity.incoming_lineages?.length) {
      cgiarEntityDtoV2.incoming_lineages = cgiarEntity.incoming_lineages.map(
        (lineage) => this.mapLineage(lineage, true, true),
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
