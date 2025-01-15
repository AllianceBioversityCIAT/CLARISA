import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class SimpleCountryDto {
  @OpenSearchProperty({ type: 'integer' })
  code: number;

  @OpenSearchProperty({ type: 'keyword' })
  isoAlpha2: string;

  @OpenSearchProperty({ type: 'keyword' })
  isoAlpha3: string;

  @OpenSearchProperty({ type: 'text' })
  name: string;
}
