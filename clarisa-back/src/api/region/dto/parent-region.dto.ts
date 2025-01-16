import { ApiProperty } from '@nestjs/swagger';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class ParentRegionDto {
  @ApiProperty({
    description: 'The name of the region',
    type: String,
  })
  @OpenSearchProperty({ type: 'text' })
  name: string;

  @ApiProperty({
    description: 'The UN M49 code of the region',
    type: String,
  })
  @OpenSearchProperty({ type: 'integer' })
  um49Code: number;
}
