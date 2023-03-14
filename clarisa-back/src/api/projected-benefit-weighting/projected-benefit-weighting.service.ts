import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateProjectedBenefitWeightingDto } from './dto/update-projected-benefit-weighting.dto';
import { ProjectedBenefitWeighting } from './entities/projected-benefit-weighting.entity';
import { ProjectedBenefitWeightingRepository } from './repositories/projected-benefit-weighting.repository';

@Injectable()
export class ProjectedBenefitWeightingService {
  constructor(
    private projectedBenefitWeightingRepository: ProjectedBenefitWeightingRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ProjectedBenefitWeighting[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.projectedBenefitWeightingRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.projectedBenefitWeightingRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<ProjectedBenefitWeighting> {
    return await this.projectedBenefitWeightingRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(
    updateProjectedBenefitWeightingDto: UpdateProjectedBenefitWeightingDto[],
  ) {
    return await this.projectedBenefitWeightingRepository.save(
      updateProjectedBenefitWeightingDto,
    );
  }
}
