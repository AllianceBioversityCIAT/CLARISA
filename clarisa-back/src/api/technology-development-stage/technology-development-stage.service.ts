import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateTechnologyDevelopmentStageDto } from './dto/update-technology-development-stage.dto';
import { TechnologyDevelopmentStage } from './entities/technology-development-stage.entity';
import { TechnologyDevelopmentStageRepository } from './repositories/technology-development-stage.repository';
import { TechnologyDevelopmentStageMapper } from './mappers/technology-development-stage.mapper';
import { TechnologyDevelopmentStageDto } from './dto/technology-development-stage.dto';

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
        throw Error('?!');
    }

    return this._technologyDevelopmentStageMapper.classListToDtoList(
      technologyDevelopmentStages,
    );
  }

  async findOne(id: number): Promise<TechnologyDevelopmentStageDto> {
    const technologyDevelopmentStage: TechnologyDevelopmentStage =
      await this._technologyDevelopmentStagesRepository.findOneBy({
        id,
        auditableFields: { is_active: true },
      });

    return technologyDevelopmentStage
      ? this._technologyDevelopmentStageMapper.classToDto(
          technologyDevelopmentStage,
        )
      : null;
  }

  async update(
    updateTechnologyDevelopmentStageDto: UpdateTechnologyDevelopmentStageDto[],
  ) {
    return await this._technologyDevelopmentStagesRepository.save(
      updateTechnologyDevelopmentStageDto,
    );
  }
}
