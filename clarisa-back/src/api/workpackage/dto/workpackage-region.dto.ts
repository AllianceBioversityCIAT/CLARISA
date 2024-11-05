import { ApiProperty } from '@nestjs/swagger';

export class WorkpackageRegionDto {
  @ApiProperty({
    description: 'The id of the workpackage region',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The name of the region',
    type: String,
  })
  name: string;
}
