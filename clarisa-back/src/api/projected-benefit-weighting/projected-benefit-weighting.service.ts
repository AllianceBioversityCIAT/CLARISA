import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateProjectedBenefitWeightingDto } from './dto/update-projected-benefit-weighting.dto';
import { ProjectedBenefitWeightingRepository } from './repositories/projected-benefit-weighting.repository';
import { ProjectedBenefitWeightingDtoV2 } from './dto/projected-benefit-weighting.v2.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class ProjectedBenefitWeightingService {
  constructor(
    private _projectedBenefitWeightingRepository: ProjectedBenefitWeightingRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ProjectedBenefitWeightingDtoV2[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this._projectedBenefitWeightingRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this._projectedBenefitWeightingRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._projectedBenefitWeightingRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<ProjectedBenefitWeightingDtoV2> {
    return this._projectedBenefitWeightingRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._projectedBenefitWeightingRepository.target.toString(),
          id,
        );
      });
  }

  async update(
    updateProjectedBenefitWeightingDto: UpdateProjectedBenefitWeightingDto[],
  ) {
    return await this._projectedBenefitWeightingRepository.save(
      updateProjectedBenefitWeightingDto,
    );
  }
}
