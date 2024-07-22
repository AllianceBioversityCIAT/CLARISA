import { Injectable } from '@nestjs/common';
import { ProjectedBenefitProbability } from '../entities/projected-benefit-probability.entity';
import { ProjectedBenefitProbabilityDto } from '../dto/projected-benefit-probability.dto';

@Injectable()
export class ProjectedBenefitProbabilityMapper {
  public classToDto(
    projectedBenefitProbability: ProjectedBenefitProbability,
  ): ProjectedBenefitProbabilityDto {
    const projectedBenefitProbabilityDto: ProjectedBenefitProbabilityDto =
      new ProjectedBenefitProbabilityDto();

    projectedBenefitProbabilityDto.probabilityID =
      projectedBenefitProbability.id;
    projectedBenefitProbabilityDto.probabilityName =
      projectedBenefitProbability.name;
    projectedBenefitProbabilityDto.probabilityDescription =
      projectedBenefitProbability.description;

    return projectedBenefitProbabilityDto;
  }

  public classListToDtoList(
    projectedBenefitProbabilities: ProjectedBenefitProbability[],
  ): ProjectedBenefitProbabilityDto[] {
    return projectedBenefitProbabilities.map((projectedBenefitProbability) =>
      this.classToDto(projectedBenefitProbability),
    );
  }
}
