import { ApiProperty } from '@nestjs/swagger';

export class ProjectedBenefitWeightingDtoV2 {
  @ApiProperty({
    description: 'The id of the projected benefit weighting',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The value of the weight',
    type: String,
  })
  weight_value: string;

  @ApiProperty({
    description: 'The id of the projected benefit',
    minimum: 1,
    type: Number,
  })
  projected_benefits_id: number;

  @ApiProperty({
    description: 'The id of the projected benefit weight description',
    minimum: 1,
    type: Number,
  })
  weight_description_id: number;
}
