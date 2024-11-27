import { ApiProperty } from '@nestjs/swagger';

export class ParentRegionDto {
  @ApiProperty({
    description: 'The name of the region',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The UN M49 code of the region',
    type: String,
  })
  um49Code: number;
}
