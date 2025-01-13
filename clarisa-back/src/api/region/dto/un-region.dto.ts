import { ApiProperty } from '@nestjs/swagger';
import { ParentRegionDto } from './parent-region.dto';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class UnRegionDto {
  @OpenSearchProperty({ type: 'text' })
  @ApiProperty({
    description: 'The name of the region',
    type: String,
  })
  name: string;

  @OpenSearchProperty({ type: 'integer' })
  @ApiProperty({
    description: 'The UN M49 code of the region',
    type: Number,
    minimum: 1,
  })
  um49Code: number;

  @OpenSearchProperty({ type: 'object', nestedType: ParentRegionDto })
  @ApiProperty({
    description: 'The parent of the region',
    type: ParentRegionDto,
    nullable: true,
  })
  parentRegion: ParentRegionDto;
}
