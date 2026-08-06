import { ApiProperty } from '@nestjs/swagger';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class ParentRegionDto {
  @ApiProperty({ example: 'Americas', description: 'Parent region name.' })
  @OpenSearchProperty({ type: 'text' })
  name: string;

  @ApiProperty({ example: 19, description: 'UN M49 code of the parent region.' })
  @OpenSearchProperty({ type: 'integer' })
  um49Code: number;
}
