import { Injectable } from '@nestjs/common';
import { FindOptionsSelect, FindOptionsWhere } from 'typeorm';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SourceOption } from '../../shared/entities/enums/source-options';
import { UpdateInnovationTypeDto } from './dto/update-innovation-type.dto';
import { InnovationType } from './entities/innovation-type.entity';
import { InnovationTypeRepository } from './repositories/innovation-type.repository';
import { InnovationTypeDto } from './dto/innovation-type.dto';
import { InnovationTypeMapper } from './mappers/innovation-type.mapper';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class InnovationTypeService {
  constructor(
    private _innovationTypesRepository: InnovationTypeRepository,
    private _innovationTypeMapper: InnovationTypeMapper,
  ) {}
  private readonly _select: FindOptionsSelect<InnovationType> = {
    id: true,
    name: true,
    definition: true,
    source_id: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type: string = SourceOption.ONE_CGIAR.path,
  ): Promise<InnovationTypeDto[]> {
    let innovationTypes: InnovationType[] = [];
    let whereClause: FindOptionsWhere<InnovationType> = {};
    const incomingType = SourceOption.getfromPath(type);

    switch (type) {
      case SourceOption.ALL.path:
        // do nothing. no extra conditions needed
        break;
      case SourceOption.ONE_CGIAR.path:
      case SourceOption.LEGACY.path:
      case SourceOption.INNOVATION_CATALOG.path:
        whereClause = {
          ...whereClause,
          source_id: incomingType.source_id,
        };
        break;
      default:
        throw new BadParamsError(
          this._innovationTypesRepository.target.toString(),
          'type',
          type,
        );
    }

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        innovationTypes = await this._innovationTypesRepository.find({
          where: whereClause,
          select: this._select,
        });
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          ...whereClause,
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
        innovationTypes = await this._innovationTypesRepository.find({
          where: whereClause,
          select: this._select,
        });
        break;
      default:
        throw new BadParamsError(
          this._innovationTypesRepository.target.toString(),
          'option',
          option,
        );
    }

    return this._innovationTypeMapper.classListToDtoList(innovationTypes);
  }

  async findOne(id: number): Promise<InnovationTypeDto> {
    return this._innovationTypesRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._innovationTypesRepository.target.toString(),
          id,
        );
      })
      .then((innovationType) =>
        this._innovationTypeMapper.classToDto(innovationType, true),
      );
  }

  async update(updateInnovationTypeDto: UpdateInnovationTypeDto[]) {
    return await this._innovationTypesRepository.save(updateInnovationTypeDto);
  }
}
