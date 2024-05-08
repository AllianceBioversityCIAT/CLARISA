import { Injectable } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, In } from 'typeorm';
import { CgiarEntityTypeOption } from '../../shared/entities/enums/cgiar-entity-types';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { CgiarEntityType } from './entities/cgiar-entity-type.entity';
import { CgiarEntityTypeRepository } from './repositories/cgiar-entity-type.repository';
import { BasicDto } from '../../shared/entities/dtos/basic-dto';
import { CgiarEntityTypeMapper } from './mappers/cgiar-entity-type.mapper';
import { CgiarEntityTypeDtoV2 } from './dto/cgiar-entity-type.v2.dto';

@Injectable()
export class CgiarEntityTypeService {
  constructor(
    private _cgiarEntityTypeRepository: CgiarEntityTypeRepository,
    private readonly _cgiarEntityTypeMapper: CgiarEntityTypeMapper,
  ) {}

  private readonly _findOptions: FindManyOptions<CgiarEntityType> = {
    relations: {
      parent_object: true,
      funding_source_object: true,
      portfolio_object: true,
    },
  };

  private readonly defaultTypes = [
    CgiarEntityTypeOption.CRP,
    CgiarEntityTypeOption.PLATFORM,
    CgiarEntityTypeOption.CENTER,
    CgiarEntityTypeOption.INITIATIVE,
    CgiarEntityTypeOption.IMPACT_AREA_PLATFORM,
    CgiarEntityTypeOption.ONE_CGIAR_SGP,
  ].map((cet) => cet.entity_type_id);

  private readonly whereClause: FindOptionsWhere<CgiarEntityType> = {
    id: In(this.defaultTypes),
  };

  async findAllV1(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDto[]> {
    let cgiarEntityTypes: CgiarEntityType[] = [];
    let showIsActive = true;
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        cgiarEntityTypes = await this._cgiarEntityTypeRepository.find({
          where: this.whereClause,
        });
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        showIsActive = option !== FindAllOptions.SHOW_ONLY_ACTIVE;
        cgiarEntityTypes = await this._cgiarEntityTypeRepository.find({
          where: {
            ...this.whereClause,
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw Error('?!');
    }

    return this._cgiarEntityTypeMapper.classListToDtoV1List(
      cgiarEntityTypes,
      showIsActive,
    );
  }

  async findOneV1(id: number): Promise<BasicDto> {
    const result = await this._cgiarEntityTypeRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });

    return this._cgiarEntityTypeMapper.classToDtoV1(result);
  }

  async findAllV2(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<CgiarEntityTypeDtoV2[]> {
    let cgiarEntityTypes: CgiarEntityType[] = [];
    let showIsActive = true;
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        cgiarEntityTypes = await this._cgiarEntityTypeRepository.find(
          this._findOptions,
        );
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        showIsActive = option !== FindAllOptions.SHOW_ONLY_ACTIVE;
        cgiarEntityTypes = await this._cgiarEntityTypeRepository.find({
          relations: this._findOptions.relations,
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw Error('?!');
    }

    return this._cgiarEntityTypeMapper.classListToDtoV2List(
      cgiarEntityTypes,
      showIsActive,
    );
  }

  async findOneV2(id: number): Promise<CgiarEntityTypeDtoV2> {
    const result = await this._cgiarEntityTypeRepository.findOne({
      where: { id },
      relations: this._findOptions.relations,
    });

    return this._cgiarEntityTypeMapper.classToDtoV2(result, true);
  }
}
