import { Injectable } from '@nestjs/common';
import {
  BasicDtoEquivalences,
  BasicDtoMapper,
} from '../../../shared/mappers/basic-dto.mapper';
import { CgiarEntityTypeMapper } from '../../cgiar-entity-type/mappers/cgiar-entity-type.mapper';
import { CenterDtoV1 } from '../dto/center.v1.dto';
import { Center } from '../entities/center.entity';

@Injectable()
export class CenterMapper {
  constructor(
    private readonly _basicDtoMapper: BasicDtoMapper<Center>,
    private readonly _cgiarEntityTypeMapper: CgiarEntityTypeMapper,
  ) {}

  private readonly _mappedBasicFields: BasicDtoEquivalences<Center> = {
    code: 'smo_code',
    name: 'name',
  };

  public classToDtoV1(
    center: Center,
    showIsActive: boolean = false,
  ): CenterDtoV1 {
    const centerDtoV1: CenterDtoV1 = new CenterDtoV1();

    Object.assign(
      centerDtoV1,
      this._basicDtoMapper.classToDto(
        center,
        showIsActive,
        this._mappedBasicFields,
      ),
    );

    centerDtoV1.acronym = center.acronym;
    centerDtoV1.financial_code = center.financial_code;
    centerDtoV1.institutionId = center.institution_id;

    if (center.cgiar_entity_type_object) {
      centerDtoV1.cgiarEntityTypeDTO = this._cgiarEntityTypeMapper.classToDtoV1(
        center.cgiar_entity_type_object,
      );
    }

    return centerDtoV1;
  }

  public classListToDtoV1List(
    cgiarEntities: Center[],
    showIsActive: boolean = false,
  ): CenterDtoV1[] {
    return cgiarEntities.map((center) =>
      this.classToDtoV1(center, showIsActive),
    );
  }
}
