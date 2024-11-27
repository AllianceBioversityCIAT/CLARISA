import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ScienceGroupDto } from './dto/science-group.dto';
import { UpdateScienceGroupDto } from './dto/update-science-group.dto';
import { ScienceGroup } from './entities/science-group.entity';
import { ScienceGroupRepository } from './repositories/science-group.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { FindManyOptions } from 'typeorm';
import { ScienceGroupMapper } from './mappers/science-group.mapper';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class ScienceGroupService {
  private readonly _findParams: FindManyOptions<ScienceGroup> = {
    select: {
      id: true,
      description: true,
      financial_code: true,
      parent_id: true,
      parent: {
        id: true,
        description: true,
      },
    },
    relations: { parent: true },
  };

  constructor(
    private _scienceGroupsRepository: ScienceGroupRepository,
    private _scienceGroupMapper: ScienceGroupMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ScienceGroupDto[]> {
    let scienceGroups: ScienceGroup[] = [];

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        scienceGroups = await this._scienceGroupsRepository.find(
          this._findParams,
        );
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        scienceGroups = await this._scienceGroupsRepository.find({
          ...this._findParams,
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw new BadParamsError(
          this._scienceGroupsRepository.target.toString(),
          'option',
          option,
        );
    }

    return this._scienceGroupMapper.classListToDtoList(scienceGroups);
  }

  async findOne(id: number): Promise<ScienceGroupDto> {
    return this._scienceGroupsRepository
      .findOneOrFail({
        ...this._findParams,
        where: {
          id,
          auditableFields: { is_active: true },
        },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._scienceGroupsRepository.target.toString(),
          id,
        );
      })
      .then((scienceGroup) =>
        this._scienceGroupMapper.classToDto(scienceGroup),
      );
  }

  async update(
    updateUserDtoList: UpdateScienceGroupDto[],
  ): Promise<ScienceGroup[]> {
    return await this._scienceGroupsRepository.save(updateUserDtoList);
  }
}
