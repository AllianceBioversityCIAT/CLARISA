import { ApiProperty } from '@nestjs/swagger';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class ParentRegionDto {
  @OpenSearchProperty({ type: 'text' })
  @ApiProperty({
    description: 'The name of the region',
    type: String,
  })
  name: string;

  @OpenSearchProperty({ type: 'integer' })
  @ApiProperty({
    description: 'The UN M49 code of the region',
    type: String,
  })
  um49Code: number;
}
