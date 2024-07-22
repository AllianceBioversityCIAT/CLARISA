import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateProjectedBenefitWeightDescriptionDto } from './dto/update-projected-benefit-weight-description.dto';
import { ProjectedBenefitWeightDescription } from './entities/projected-benefit-weight-description.entity';
import { ProjectedBenefitWeightDescriptionRepository } from './repositories/projected-benefit-weight-description.repository';
import { ProjectedBenefitWeightDescriptionDto } from './dto/projected-benefit-weight-description.dto';
import { ProjectedBenefitWeightDescriptionMapper } from './mappers/projected-benefit-weight-description.mapper';

@Injectable()
export class ProjectedBenefitWeightDescriptionService {
  constructor(
    private _projectedBenefitWeightDescriptionRepository: ProjectedBenefitWeightDescriptionRepository,
    private _projectedBenefitWeightDescriptionMapper: ProjectedBenefitWeightDescriptionMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ProjectedBenefitWeightDescriptionDto[]> {
    let weightDescriptions: ProjectedBenefitWeightDescription[] = [];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        weightDescriptions =
          await this._projectedBenefitWeightDescriptionRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        weightDescriptions =
          await this._projectedBenefitWeightDescriptionRepository.find({
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

    return this._projectedBenefitWeightDescriptionMapper.classListToDtoList(
      weightDescriptions,
    );
  }

  async findOne(id: number): Promise<ProjectedBenefitWeightDescriptionDto> {
    const weightDescription: ProjectedBenefitWeightDescription =
      await this._projectedBenefitWeightDescriptionRepository.findOneBy({
        id,
        auditableFields: { is_active: true },
      });

    return weightDescription
      ? this._projectedBenefitWeightDescriptionMapper.classToDto(
          weightDescription,
        )
      : null;
  }

  async update(
    updateProjectedBenefitWeightDescriptionDto: UpdateProjectedBenefitWeightDescriptionDto[],
  ) {
    return await this._projectedBenefitWeightDescriptionRepository.save(
      updateProjectedBenefitWeightDescriptionDto,
    );
  }
}
