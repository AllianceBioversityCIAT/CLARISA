import { Injectable } from '@nestjs/common';
import { ProjectedBenefitWeightDescription } from '../entities/projected-benefit-weight-description.entity';
import { ProjectedBenefitWeightDescriptionDto } from '../dto/projected-benefit-weight-description.dto';

@Injectable()
export class ProjectedBenefitWeightDescriptionMapper {
  public classToDto(
    projectedBenefitWeightDescription: ProjectedBenefitWeightDescription,
  ): ProjectedBenefitWeightDescriptionDto {
    const projectedBenefitWeightDescriptionDto: ProjectedBenefitWeightDescriptionDto =
      new ProjectedBenefitWeightDescriptionDto();

    projectedBenefitWeightDescriptionDto.descriptionID =
      projectedBenefitWeightDescription.id;
    projectedBenefitWeightDescriptionDto.description =
      projectedBenefitWeightDescription.description;

    return projectedBenefitWeightDescriptionDto;
  }

  public classListToDtoList(
    projectedBenefitWeightDescriptions: ProjectedBenefitWeightDescription[],
  ): ProjectedBenefitWeightDescriptionDto[] {
    return projectedBenefitWeightDescriptions.map(
      (projectedBenefitWeightDescription) =>
        this.classToDto(projectedBenefitWeightDescription),
    );
  }
}
