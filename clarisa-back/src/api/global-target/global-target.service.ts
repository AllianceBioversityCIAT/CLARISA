import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateGlobalTargetDto } from './dto/update-global-target.dto';
import { GlobalTarget } from './entities/global-target.entity';
import { GlobalTargetRepository } from './repositories/global-target.repository';
import { FindManyOptions } from 'typeorm';
import { GlobalTargetMapper } from './mappers/global-target.mapper';
import { GlobalTargetDto } from './dto/global-target.dto';

@Injectable()
export class GlobalTargetService {
  constructor(
    private _globalTargetRepository: GlobalTargetRepository,
    private _globalTargetMapper: GlobalTargetMapper,
  ) {}
  private readonly _findClause: FindManyOptions<GlobalTarget> = {
    select: {
      id: true,
      smo_code: true,
      global_target: true,
      impact_area_object: {
        id: true,
        name: true,
      },
    },
    relations: { impact_area_object: true },
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<GlobalTargetDto[]> {
    let globalTargets: GlobalTarget[] = [];

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        globalTargets = await this._globalTargetRepository.find(
          this._findClause,
        );
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        globalTargets = await this._globalTargetRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          ...this._findClause,
        });
        break;
      default:
        throw Error('?!');
    }

    return this._globalTargetMapper.classListToDtoList(globalTargets);
  }

  async findOne(id: number): Promise<GlobalTargetDto> {
    const globalTarget: GlobalTarget =
      await this._globalTargetRepository.findOne({
        where: { id },
        ...this._findClause,
      });

    return globalTarget
      ? this._globalTargetMapper.classToDto(globalTarget)
      : null;
  }

  async getUsersPagination(offset?: number, limit = 10) {
    const [items, count] = await this._globalTargetRepository.findAndCount({
      order: {
        id: 'ASC',
      },
      skip: offset,
      take: limit,
      ...this._findClause,
    });

    return {
      items,
      count,
    };
  }

  async update(
    updateUserDtoList: UpdateGlobalTargetDto[],
  ): Promise<GlobalTarget[]> {
    return await this._globalTargetRepository.save(updateUserDtoList);
  }
}
