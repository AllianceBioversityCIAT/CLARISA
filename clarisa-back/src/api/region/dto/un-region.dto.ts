import { ApiProperty } from '@nestjs/swagger';
import { ParentRegionDto } from './parent-region.dto';

export class UnRegionDto {
  @ApiProperty({
    description: 'The name of the region',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The UN M49 code of the region',
    type: Number,
    minimum: 1,
  })
  um49Code: number;

  @ApiProperty({
    description: 'The parent of the region',
    type: ParentRegionDto,
    nullable: true,
  })
  parentRegion: ParentRegionDto;
}
