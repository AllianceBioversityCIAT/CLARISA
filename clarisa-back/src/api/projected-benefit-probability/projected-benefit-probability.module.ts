import { Module } from '@nestjs/common';
import { ProjectedBenefitProbabilityService } from './projected-benefit-probability.service';
import { ProjectedBenefitProbabilityController } from './projected-benefit-probability.controller';
import { ProjectedBenefitProbabilityRepository } from './repositories/projected-benefit-probability.repository';
import { ProjectedBenefitProbabilityMapper } from './mappers/projected-benefit-probability.mapper';

@Module({
  controllers: [ProjectedBenefitProbabilityController],
  providers: [
    ProjectedBenefitProbabilityService,
    ProjectedBenefitProbabilityRepository,
    ProjectedBenefitProbabilityMapper,
  ],
})
export class ProjectedBenefitProbabilityModule {}
