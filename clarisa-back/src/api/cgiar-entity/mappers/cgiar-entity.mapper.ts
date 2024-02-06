import { Injectable } from '@nestjs/common';
import { CgiarEntity } from '../entities/cgiar-entity.entity';
import { CgiarEntityDto } from '../dto/cgiar-entity.dto';
import { CgiarEntityTypeMapper } from '../../cgiar-entity-type/mappers/cgiar-entity-type.mapper';

@Injectable()
export class CgiarEntityMapper {
  constructor(private _cgiarEntityTypeMapper: CgiarEntityTypeMapper) {}

  classToDto(cgiarEntity: CgiarEntity): CgiarEntityDto {
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

    if (cgiarEntity.parent_object) {
      cgiarEntityDto.parent = this.classToDto(cgiarEntity.parent_object);
    }

    if (cgiarEntity.children_array) {
      cgiarEntityDto.children = cgiarEntity.children_array.map((child) =>
        this.classToDto(child),
      );
    }

    return cgiarEntityDto;
  }
}
