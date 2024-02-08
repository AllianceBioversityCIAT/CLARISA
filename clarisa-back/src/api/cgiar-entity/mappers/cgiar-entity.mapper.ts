import { Injectable } from '@nestjs/common';
import { CgiarEntity } from '../entities/cgiar-entity.entity';
import { CgiarEntityDto } from '../dto/cgiar-entity.dto';
import { CgiarEntityTypeMapper } from '../../cgiar-entity-type/mappers/cgiar-entity-type.mapper';
import { FrameworkMapper } from '../../framework/mappers/framework.mapper';

@Injectable()
export class CgiarEntityMapper {
  constructor(
    private _cgiarEntityTypeMapper: CgiarEntityTypeMapper,
    private _frameworkMapper: FrameworkMapper,
  ) {}

  classToDto(
    cgiarEntity: CgiarEntity,
    mapParent: boolean = true,
  ): CgiarEntityDto {
    const cgiarEntityDto: CgiarEntityDto = new CgiarEntityDto();

    cgiarEntityDto.name = cgiarEntity.name;
    cgiarEntityDto.acronym = cgiarEntity.acronym;
    cgiarEntityDto.code = cgiarEntity.smo_code;
    cgiarEntityDto.financial_code = cgiarEntity.financial_code;
    cgiarEntityDto.institutionId = cgiarEntity.institution_id;

    if (cgiarEntity.cgiar_entity_type_object) {
      cgiarEntityDto.cgiarEntityTypeDTO =
        this._cgiarEntityTypeMapper.classToDto(
          cgiarEntity.cgiar_entity_type_object,
        );
    }

    if (cgiarEntity.parent_object && mapParent) {
      cgiarEntityDto.parent = this.classToDto(
        cgiarEntity.parent_object,
        mapParent,
      );
    }

    if (cgiarEntity.framework_object) {
      cgiarEntityDto.frameworkDTO = this._frameworkMapper.classToDto(
        cgiarEntity.framework_object,
      );
    }

    if (cgiarEntity.children_array) {
      cgiarEntityDto.children = cgiarEntity.children_array.map((child) =>
        this.classToDto(child, mapParent),
      );
    }

    return cgiarEntityDto;
  }
}
