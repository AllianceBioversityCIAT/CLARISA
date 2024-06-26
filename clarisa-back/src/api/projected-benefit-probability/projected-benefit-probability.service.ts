import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateProjectedBenefitProbabilityDto } from './dto/update-projected-benefit-probability.dto';
import { ProjectedBenefitProbability } from './entities/projected-benefit-probability.entity';
import { ProjectedBenefitProbabilityRepository } from './repositories/projected-benefit-probability.repository';

@Injectable()
export class ProjectedBenefitProbabilityService {
  constructor(
    private projectedBenefitProbabilitysRepository: ProjectedBenefitProbabilityRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ProjectedBenefitProbability[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.projectedBenefitProbabilitysRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.projectedBenefitProbabilitysRepository.find({
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

  async findOne(id: number): Promise<ProjectedBenefitProbability> {
    return await this.projectedBenefitProbabilitysRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(
    updateProjectedBenefitProbabilityDto: UpdateProjectedBenefitProbabilityDto[],
  ) {
    return await this.projectedBenefitProbabilitysRepository.save(
      updateProjectedBenefitProbabilityDto,
    );
  }
}
