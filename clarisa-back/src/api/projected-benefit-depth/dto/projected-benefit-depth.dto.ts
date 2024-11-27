import { ApiProperty } from '@nestjs/swagger';

export class ProjectedBenefitDepthDto {
  @ApiProperty({
    description: 'The id of the projected benefit depth',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The id of the projected benefit',
    minimum: 1,
    type: Number,
  })
  projected_benefit_id: number;

  @ApiProperty({
    description: 'The id of the depth description',
    minimum: 1,
    type: Number,
  })
  depth_description_id: number;
}
