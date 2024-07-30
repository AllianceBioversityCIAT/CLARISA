import { Injectable } from '@nestjs/common';
import { EnvironmentRepository } from './repositories/environment.repository';
import { EnvironmentMapper } from './mappers/environment.mapper';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { EnvironmentDto } from './dto/environment.dto';
import { Environment } from './entities/environment.entity';

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
        throw Error('?!');
    }

    return this._environmentMapper.classListToDtoList(
      environments,
      showIsActive,
    );
  }

  async findOneByAcronym(acronym: string): Promise<EnvironmentDto> {
    const environment: Environment =
      await this._environmentRepository.findOneBy({
        acronym,
        auditableFields: { is_active: true },
      });

    return environment
      ? this._environmentMapper.classToDto(environment, true)
      : null;
  }

  async findOne(id: number): Promise<EnvironmentDto> {
    const environment: Environment =
      await this._environmentRepository.findOneBy({
        id,
        auditableFields: { is_active: true },
      });

    return environment
      ? this._environmentMapper.classToDto(environment, true)
      : null;
  }
}
