import { Injectable } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SourceOption } from '../../shared/entities/enums/source-options';
import { InstitutionTypeFromParentDto } from './dto/institution-type-from-parent.dto';
import { InstitutionTypeDto } from './dto/institution-type.dto';
import { UpdateInstitutionTypeDto } from './dto/update-institution-type.dto';
import { InstitutionType } from './entities/institution-type.entity';
import { InstitutionTypeMapper } from './mappers/institution-type.mapper';
import { InstitutionTypeRepository } from './repositories/institution-type.repository';

@Injectable()
export class InstitutionTypeService {
  constructor(
    private _institutionTypesRepository: InstitutionTypeRepository,
    private _institutionTypeMapper: InstitutionTypeMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type: string = SourceOption.CGIAR.path,
  ): Promise<InstitutionTypeDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    if (!SourceOption.getfromPath(type)) {
      throw Error('?!');
    }

    return this._institutionTypesRepository.findAllTypesFromChildrenToParent(
      option,
      type,
    );
  }

  async findAllFromParentToChildren(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type: string = SourceOption.CGIAR.path,
  ): Promise<InstitutionTypeFromParentDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    if (!SourceOption.getfromPath(type)) {
      throw Error('?!');
    }

    return this._institutionTypesRepository.findAllTypesFromParentToChildren(
      option,
      type,
    );
  }

  async findAllSimple(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type: string = SourceOption.CGIAR.path,
  ): Promise<InstitutionTypeDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    if (!SourceOption.getfromPath(type)) {
      throw Error('?!');
    }

    let whereClause: FindOptionsWhere<InstitutionType> = {};
    const incomingType = SourceOption.getfromPath(type);

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
        break;
    }
    switch (type) {
      case SourceOption.ALL.path:
        // do nothing. no extra conditions needed
        break;
      case SourceOption.CGIAR.path:
      case SourceOption.LEGACY.path:
        whereClause = {
          ...whereClause,
          source_id: incomingType.source_id,
        };
        break;
      default:
        throw Error('?!');
    }

    const institutionTypes: InstitutionType[] =
      await this._institutionTypesRepository.find({
        where: whereClause,
      });

    return institutionTypes.map((it) =>
      this._institutionTypeMapper.classToSimpleDto(it),
    );
  }

  async findOne(id: number): Promise<InstitutionType> {
    return await this._institutionTypesRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(updateInstitutionTypeDto: UpdateInstitutionTypeDto[]) {
    return await this._institutionTypesRepository.save(
      updateInstitutionTypeDto,
    );
  }
}
