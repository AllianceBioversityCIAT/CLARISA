import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateProjectedBenefitDepthDto } from './dto/update-projected-benefit-depth.dto';
import { ProjectedBenefitDepthRepository } from './repositories/projected-benefit-depth.repository';
import { ProjectedBenefitDepthDto } from './dto/projected-benefit-depth.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class ProjectedBenefitDepthService {
  constructor(
    private _projectedBenefitDepthRepository: ProjectedBenefitDepthRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ProjectedBenefitDepthDto[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._projectedBenefitDepthRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._projectedBenefitDepthRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._projectedBenefitDepthRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<ProjectedBenefitDepthDto> {
    return this._projectedBenefitDepthRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._projectedBenefitDepthRepository.target.toString(),
          id,
        );
      });
  }

  async update(
    updateProjectedBenefitDepthDto: UpdateProjectedBenefitDepthDto[],
  ) {
    return await this._projectedBenefitDepthRepository.save(
      updateProjectedBenefitDepthDto,
    );
  }
}
