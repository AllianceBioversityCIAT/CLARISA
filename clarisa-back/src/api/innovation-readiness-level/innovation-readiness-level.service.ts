import { Injectable } from '@nestjs/common';
import { FindOptionsSelect, FindOptionsWhere } from 'typeorm';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SourceOption } from '../../shared/entities/enums/source-options';
import { UpdateInnovationReadinessLevelDto } from './dto/update-innovation-readiness-level.dto';
import { InnovationReadinessLevel } from './entities/innovation-readiness-level.entity';
import { InnovationReadinessLevelRepository } from './repositories/innovation-readiness-level.repository';
import { InnovationReadinessLevelDto } from './dto/innovation-readiness-level.dto';

@Injectable()
export class InnovationReadinessLevelService {
  constructor(
    private innovationReadinessLevelRepository: InnovationReadinessLevelRepository,
  ) {}
  private readonly _select: FindOptionsSelect<InnovationReadinessLevel> = {
    id: true,
    name: true,
    definition: true,
    level: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    type: string = SourceOption.ONE_CGIAR.path,
  ): Promise<InnovationReadinessLevelDto[]> {
    let whereClause: FindOptionsWhere<InnovationReadinessLevel> = {};
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
        throw Error('?!');
    }

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.innovationReadinessLevelRepository.find({
          where: whereClause,
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          ...whereClause,
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
        return await this.innovationReadinessLevelRepository.find({
          where: whereClause,
          select: this._select,
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<InnovationReadinessLevel> {
    return await this.innovationReadinessLevelRepository.findOne({
      where: { id, auditableFields: { is_active: true } },
      select: this._select,
    });
  }

  async update(
    updateInnovationReadinessLevelDtoList: UpdateInnovationReadinessLevelDto[],
  ): Promise<InnovationReadinessLevel[]> {
    return await this.innovationReadinessLevelRepository.save(
      updateInnovationReadinessLevelDtoList,
    );
  }
}
