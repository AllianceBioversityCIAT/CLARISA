import { Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, In } from 'typeorm';
import { CgiarEntityTypeOption } from '../../shared/entities/enums/cgiar-entity-types';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { CgiarEntityTypeRepository } from './repositories/cgiar-entity-type.repository';
import { CgiarEntityTypeMapper } from './mappers/cgiar-entity-type.mapper';
import { CgiarEntityTypeDto } from './dto/cgiar-entity-type.dto';
import { CgiarEntityType } from './entities/cgiar-entity-type.entity';

@Injectable()
export class CgiarEntityTypeService {
  constructor(
    private _cgiarEntityTypeRepository: CgiarEntityTypeRepository,
    private _cgiarEntityTypeMapper: CgiarEntityTypeMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<CgiarEntityTypeDto[]> {
    const commonTypesIds = CgiarEntityTypeOption.getCommonTypes().map(
      (cet) => cet.entity_type_id,
    );
    const whereClause: FindOptionsWhere<CgiarEntityType> = {
      id: In(commonTypesIds),
    };

    if (option !== FindAllOptions.SHOW_ALL) {
      whereClause.auditableFields = {
        is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
      };
    }

    const cgiarEntityTypes = await this._cgiarEntityTypeRepository.find({
      select: { id: true, name: true },
      where: whereClause,
    });

    return cgiarEntityTypes.map((cet) =>
      this._cgiarEntityTypeMapper.classToDto(cet),
    );
  }

  async findOne(id: number): Promise<CgiarEntityTypeDto> {
    const cgiarEntityType = await this._cgiarEntityTypeRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });

    if (!cgiarEntityType) {
      throw new NotFoundException(`Entity Type with id "${id}" not found`);
    }

    return this._cgiarEntityTypeMapper.classToDto(cgiarEntityType);
  }
}
