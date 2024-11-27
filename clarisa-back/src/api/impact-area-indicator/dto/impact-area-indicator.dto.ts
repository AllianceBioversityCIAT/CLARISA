import { ApiProperty } from '@nestjs/swagger';

export class ImpactAreaIndicatorDto {
  @ApiProperty({
    description: 'The id of the impact area indicator',
    minimum: 1,
    type: Number,
  })
  indicatorId: number;

  @ApiProperty({
    description: 'The statement of the impact area indicator',
    type: String,
  })
  indicatorStatement: string;

  @ApiProperty({
    description: 'The id of the impact area',
    minimum: 1,
    type: Number,
  })
  impactAreaId: number;

  @ApiProperty({
    description: 'The name of the impact area',
    type: String,
  })
  impactAreaName: string;

  @ApiProperty({
    description: 'The target year of the impact area indicator',
    minimum: 1,
    type: Number,
  })
  targetYear: number;

  @ApiProperty({
    description: 'The target unit of the impact area indicator',
    type: String,
  })
  targetUnit: string;

  @ApiProperty({
    description: 'The target value of the impact area indicator',
    type: String,
  })
  value: string;

  @ApiProperty({
    description:
      'Does the projected benefit apply for the impact area indicator?',
    type: Boolean,
  })
  isApplicableProjectedBenefits: boolean;
}
