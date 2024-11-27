import { Injectable } from '@nestjs/common';
import { TechnologyDevelopmentStage } from '../entities/technology-development-stage.entity';
import { TechnologyDevelopmentStageDto } from '../dto/technology-development-stage.dto';

@Injectable()
export class TechnologyDevelopmentStageMapper {
  public classToDto(
    technologyDevelopmentStage: TechnologyDevelopmentStage,
    showIsActive: boolean = false,
  ): TechnologyDevelopmentStageDto {
    const technologyDevelopmentStageDto: TechnologyDevelopmentStageDto =
      new TechnologyDevelopmentStageDto();

    technologyDevelopmentStageDto.id = technologyDevelopmentStage.id;
    technologyDevelopmentStageDto.name = technologyDevelopmentStage.name;
    technologyDevelopmentStageDto.officialCode =
      technologyDevelopmentStage.official_code;
    if (showIsActive) {
      technologyDevelopmentStageDto.is_active =
        technologyDevelopmentStage.auditableFields?.is_active;
    }

    return technologyDevelopmentStageDto;
  }

  public classListToDtoList(
    technologyDevelopmentStages: TechnologyDevelopmentStage[],
    showIsActive: boolean = false,
  ): TechnologyDevelopmentStageDto[] {
    return technologyDevelopmentStages.map((technologyDevelopmentStage) =>
      this.classToDto(technologyDevelopmentStage, showIsActive),
    );
  }
}
