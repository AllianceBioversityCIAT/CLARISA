import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';
import { SourceOption } from 'src/shared/entities/enums/source-options';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CreateGeographicScopeDto } from './dto/create-geographic-scope.dto';
import { UpdateGeographicScopeDto } from './dto/update-geographic-scope.dto';
import { GeographicScope } from './entities/geographic-scope.entity';

@Injectable()
export class GeographicScopeService {
  constructor(
    @InjectRepository(GeographicScope)
    private geographicScopesRepository: Repository<GeographicScope>,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type: string = SourceOption.CGIAR.path,
  ): Promise<GeographicScope[]> {
    let whereClause: FindOptionsWhere<GeographicScope> = {};
    const incomingType = SourceOption.getfromPath(type);

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

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.geographicScopesRepository.find({
          where: whereClause,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          ...whereClause,
          is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
        };
        return await this.geographicScopesRepository.find({
          where: whereClause,
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<GeographicScope> {
    return await this.geographicScopesRepository.findOneBy({
      id,
      is_active: true,
    });
  }

  async update(updateGeographicScopeDto: UpdateGeographicScopeDto[]) {
    return await this.geographicScopesRepository.save(updateGeographicScopeDto);
  }
}
