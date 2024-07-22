import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateProjectedBenefitDepthDto } from './dto/update-projected-benefit-depth.dto';
import { ProjectedBenefitDepthRepository } from './repositories/projected-benefit-depth.repository';
import { ProjectedBenefitDepthDto } from './dto/projected-benefit-depth.dto';

@Injectable()
export class ProjectedBenefitDepthService {
  constructor(
    private projectedBenefitDepthRepository: ProjectedBenefitDepthRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ProjectedBenefitDepthDto[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.projectedBenefitDepthRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.projectedBenefitDepthRepository.find({
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

  async findOne(id: number): Promise<ProjectedBenefitDepthDto> {
    return await this.projectedBenefitDepthRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(
    updateProjectedBenefitDepthDto: UpdateProjectedBenefitDepthDto[],
  ) {
    return await this.projectedBenefitDepthRepository.save(
      updateProjectedBenefitDepthDto,
    );
  }
}
