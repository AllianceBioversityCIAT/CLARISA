import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ProjectedBenefitDto } from './dto/projected-benefit.dto';
import { UpdateProjectedBenefitDto } from './dto/update-projected-benefit.dto';
import { ProjectedBenefitRepository } from './repositories/projected-benefit.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class ProjectedBenefitService {
  constructor(
    private _projectedBenefitsRepository: ProjectedBenefitRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ProjectedBenefitDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._projectedBenefitsRepository.target.toString(),
        'option',
        option,
      );
    }

    return this._projectedBenefitsRepository.findProjectedBenefits(option);
  }

  async findOne(id: number): Promise<ProjectedBenefitDto> {
    return this._projectedBenefitsRepository
      .findProjectedBenefitById(id)
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._projectedBenefitsRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateProjectedBenefitDto: UpdateProjectedBenefitDto[]) {
    return await this._projectedBenefitsRepository.save(
      updateProjectedBenefitDto,
    );
  }
}
