import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class ParentRegionDto {
  @OpenSearchProperty({ type: 'text' })
  name: string;

  @OpenSearchProperty({ type: 'integer' })
  um49Code: number;
}
