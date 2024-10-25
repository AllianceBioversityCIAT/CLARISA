import { Injectable } from '@nestjs/common';
import { EnvironmentRepository } from './repositories/environment.repository';
import { EnvironmentMapper } from './mappers/environment.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { EnvironmentDto } from './dto/environment.dto';
import { Environment } from './entities/environment.entity';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class EnvironmentService {
  constructor(
    private _environmentRepository: EnvironmentRepository,
    private _environmentMapper: EnvironmentMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<EnvironmentDto[]> {
    let environments: Environment[] = [];
    let showIsActive: boolean = true;

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        environments = await this._environmentRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        showIsActive = option !== FindAllOptions.SHOW_ONLY_ACTIVE;
        environments = await this._environmentRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw new BadParamsError(
          this._environmentRepository.target.toString(),
          'option',
          option,
        );
    }

    return this._environmentMapper.classListToDtoList(
      environments,
      showIsActive,
    );
  }

  async findOneByAcronym(acronym: string): Promise<EnvironmentDto> {
    return this._environmentRepository
      .findOneByOrFail({
        acronym,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forSingleParam(
          this._environmentRepository.target.toString(),
          'acronym',
          acronym,
        );
      })
      .then((environment) =>
        this._environmentMapper.classToDto(environment, true),
      );
  }

  async findOne(id: number): Promise<EnvironmentDto> {
    return this._environmentRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._environmentRepository.target.toString(),
          id,
        );
      })
      .then((environment) =>
        this._environmentMapper.classToDto(environment, true),
      );
  }
}
