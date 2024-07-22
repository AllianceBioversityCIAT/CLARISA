import { OmitType } from '@nestjs/mapped-types';
import { DepthDescriptionDto } from '../../depth-description/dto/depth-description.dto';
import { ImpactAreaIndicatorDto } from '../../impact-area-indicator/dto/impact-area-indicator.dto';
import { ProjectedBenefitWeightingDtoV1 } from '../../projected-benefit-weighting/dto/projected-benefit-weighting.v1.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ProjectedBenefitDto extends OmitType(ImpactAreaIndicatorDto, [
  'indicatorId',
  'indicatorStatement',
] as const) {
  @ApiProperty({
    description: 'The id of the projected benefit',
    minimum: 1,
    type: Number,
  })
  projectedBenefitId: number;

  @ApiProperty({
    description: 'The id of the impact area indicator',
    minimum: 1,
    type: Number,
  })
  impactAreaIndicator: number;

  @ApiProperty({
    description: 'The statement of the impact area indicator',
    type: String,
  })
  impactAreaIndicatorName: string;

  @ApiProperty({
    description: 'The depth scales of the projected benefit',
    type: DepthDescriptionDto,
  })
  depthScales: DepthDescriptionDto[];

  @ApiProperty({
    description: 'The weighting values of the projected benefit',
    type: ProjectedBenefitWeightingDtoV1,
  })
  weightingValues: ProjectedBenefitWeightingDtoV1[];
}
