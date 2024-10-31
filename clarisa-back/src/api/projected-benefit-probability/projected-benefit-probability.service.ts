import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateProjectedBenefitProbabilityDto } from './dto/update-projected-benefit-probability.dto';
import { ProjectedBenefitProbability } from './entities/projected-benefit-probability.entity';
import { ProjectedBenefitProbabilityRepository } from './repositories/projected-benefit-probability.repository';
import { ProjectedBenefitProbabilityMapper } from './mappers/projected-benefit-probability.mapper';
import { ProjectedBenefitProbabilityDto } from './dto/projected-benefit-probability.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class ProjectedBenefitProbabilityService {
  constructor(
    private _projectedBenefitProbabilitysRepository: ProjectedBenefitProbabilityRepository,
    private _projectedBenefitProbabilityMapper: ProjectedBenefitProbabilityMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ProjectedBenefitProbabilityDto[]> {
    let probabilities: ProjectedBenefitProbability[] = [];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        probabilities =
          await this._projectedBenefitProbabilitysRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        probabilities = await this._projectedBenefitProbabilitysRepository.find(
          {
            where: {
              auditableFields: {
                is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
              },
            },
          },
        );
        break;
      default:
        throw new BadParamsError(
          this._projectedBenefitProbabilitysRepository.target.toString(),
          'option',
          option,
        );
    }

    return this._projectedBenefitProbabilityMapper.classListToDtoList(
      probabilities,
    );
  }

  async findOne(id: number): Promise<ProjectedBenefitProbabilityDto> {
    return this._projectedBenefitProbabilitysRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._projectedBenefitProbabilitysRepository.target.toString(),
          id,
        );
      })
      .then((probability) =>
        this._projectedBenefitProbabilityMapper.classToDto(probability),
      );
  }

  async update(
    updateProjectedBenefitProbabilityDto: UpdateProjectedBenefitProbabilityDto[],
  ) {
    return await this._projectedBenefitProbabilitysRepository.save(
      updateProjectedBenefitProbabilityDto,
    );
  }
}
