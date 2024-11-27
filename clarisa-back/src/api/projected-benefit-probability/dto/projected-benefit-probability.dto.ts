import { ApiProperty } from '@nestjs/swagger';

export class ProjectedBenefitProbabilityDto {
  @ApiProperty({
    description: 'The id of the projected benefit probability',
    minimum: 1,
    type: Number,
  })
  probabilityID: number;

  @ApiProperty({
    description: 'The name of the projected benefit probability',
    type: String,
  })
  probabilityName: string;

  @ApiProperty({
    description: 'The description of the projected benefit probability',
    type: String,
  })
  probabilityDescription: string;
}
