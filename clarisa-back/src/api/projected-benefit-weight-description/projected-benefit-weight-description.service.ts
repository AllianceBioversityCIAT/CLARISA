import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateProjectedBenefitWeightDescriptionDto } from './dto/update-projected-benefit-weight-description.dto';
import { ProjectedBenefitWeightDescription } from './entities/projected-benefit-weight-description.entity';
import { ProjectedBenefitWeightDescriptionRepository } from './repositories/projected-benefit-weight-description.repository';
import { ProjectedBenefitWeightDescriptionDto } from './dto/projected-benefit-weight-description.dto';
import { ProjectedBenefitWeightDescriptionMapper } from './mappers/projected-benefit-weight-description.mapper';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

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
        throw new BadParamsError(
          this._projectedBenefitWeightDescriptionRepository.target.toString(),
          'option',
          option,
        );
    }

    return this._projectedBenefitWeightDescriptionMapper.classListToDtoList(
      weightDescriptions,
    );
  }

  async findOne(id: number): Promise<ProjectedBenefitWeightDescriptionDto> {
    return this._projectedBenefitWeightDescriptionRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._projectedBenefitWeightDescriptionRepository.target.toString(),
          id,
        );
      })
      .then((weightDescription) =>
        this._projectedBenefitWeightDescriptionMapper.classToDto(
          weightDescription,
        ),
      );
  }

  async update(
    updateProjectedBenefitWeightDescriptionDto: UpdateProjectedBenefitWeightDescriptionDto[],
  ) {
    return await this._projectedBenefitWeightDescriptionRepository.save(
      updateProjectedBenefitWeightDescriptionDto,
    );
  }
}
