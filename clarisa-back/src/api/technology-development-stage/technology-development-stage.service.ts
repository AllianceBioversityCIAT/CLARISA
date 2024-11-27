import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateTechnologyDevelopmentStageDto } from './dto/update-technology-development-stage.dto';
import { TechnologyDevelopmentStage } from './entities/technology-development-stage.entity';
import { TechnologyDevelopmentStageRepository } from './repositories/technology-development-stage.repository';
import { TechnologyDevelopmentStageMapper } from './mappers/technology-development-stage.mapper';
import { TechnologyDevelopmentStageDto } from './dto/technology-development-stage.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class TechnologyDevelopmentStageService {
  constructor(
    private _technologyDevelopmentStagesRepository: TechnologyDevelopmentStageRepository,
    private _technologyDevelopmentStageMapper: TechnologyDevelopmentStageMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<TechnologyDevelopmentStageDto[]> {
    let technologyDevelopmentStages: TechnologyDevelopmentStage[] = [];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        technologyDevelopmentStages =
          await this._technologyDevelopmentStagesRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        technologyDevelopmentStages =
          await this._technologyDevelopmentStagesRepository.find({
            where: {
              auditableFields: {
                is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
              },
            },
          });
        break;
      default:
        throw new BadParamsError(
          this._technologyDevelopmentStagesRepository.target.toString(),
          'option',
          option,
        );
    }

    return this._technologyDevelopmentStageMapper.classListToDtoList(
      technologyDevelopmentStages,
    );
  }

  async findOne(id: number): Promise<TechnologyDevelopmentStageDto> {
    return this._technologyDevelopmentStagesRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._technologyDevelopmentStagesRepository.target.toString(),
          id,
        );
      })
      .then((technologyDevelopmentStage) =>
        this._technologyDevelopmentStageMapper.classToDto(
          technologyDevelopmentStage,
        ),
      );
  }

  async update(
    updateTechnologyDevelopmentStageDto: UpdateTechnologyDevelopmentStageDto[],
  ) {
    return await this._technologyDevelopmentStagesRepository.save(
      updateTechnologyDevelopmentStageDto,
    );
  }
}
