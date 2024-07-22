import { Injectable } from '@nestjs/common';
import { FindOptionsSelect, FindOptionsWhere } from 'typeorm';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SourceOption } from '../../shared/entities/enums/source-options';
import { UpdateGeographicScopeDto } from './dto/update-geographic-scope.dto';
import { GeographicScope } from './entities/geographic-scope.entity';
import { GeographicScopeRepository } from './repositories/geographic-scope.repository';
import { GeographicScopeDto } from './dto/geographic-scope.dto';
import { GeographicScopeMapper } from './mappers/geographic-scope.mapper';

@Injectable()
export class GeographicScopeService {
  constructor(
    private _geographicScopesRepository: GeographicScopeRepository,
    private _geographicScopesMapper: GeographicScopeMapper,
  ) {}
  private readonly _select: FindOptionsSelect<GeographicScope> = {
    id: true,
    name: true,
    definition: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type: string = SourceOption.LEGACY.path,
  ): Promise<GeographicScopeDto[]> {
    let geographicScopes: GeographicScope[] = [];
    let whereClause: FindOptionsWhere<GeographicScope> = {};
    const incomingType = SourceOption.getfromPath(type);

    switch (type) {
      case SourceOption.ALL.path:
        // do nothing. no extra conditions needed
        break;
      case SourceOption.LEGACY.path:
        whereClause = {
          ...whereClause,
          source_id: incomingType.source_id,
        };
        break;
      case SourceOption.ONE_CGIAR.path:
        whereClause = {
          ...whereClause,
          source_id: SourceOption.LEGACY.source_id,
          is_one_cgiar: true,
        };
        break;
      default:
        throw Error('?!');
    }

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        geographicScopes = await this._geographicScopesRepository.find({
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
        geographicScopes = await this._geographicScopesRepository.find({
          where: whereClause,
          select: this._select,
        });
        break;
      default:
        throw Error('?!');
    }

    return this._geographicScopesMapper.classListToDtoList(geographicScopes);
  }

  async findOne(id: number): Promise<GeographicScopeDto> {
    const geographicScope: GeographicScope =
      await this._geographicScopesRepository.findOne({
        where: { id, auditableFields: { is_active: true } },
        select: this._select,
      });

    return geographicScope
      ? this._geographicScopesMapper.classToDto(geographicScope)
      : null;
  }

  async update(updateGeographicScopeDto: UpdateGeographicScopeDto[]) {
    return await this._geographicScopesRepository.save(
      updateGeographicScopeDto,
    );
  }
}
