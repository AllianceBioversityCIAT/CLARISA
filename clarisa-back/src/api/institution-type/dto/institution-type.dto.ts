import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class InstitutionTypeDto {
  @OpenSearchProperty({ type: 'integer' })
  code: number;

  @OpenSearchProperty({ type: 'text' })
  name: string;

  @OpenSearchProperty({ type: 'text' })
  description?: string;

  @OpenSearchProperty({ type: 'object', nestedType: InstitutionTypeDto })
  parent?: InstitutionTypeDto;

  @OpenSearchProperty({ type: 'integer' })
  legacy?: boolean;

  @OpenSearchProperty({ type: 'integer' })
  id_parent?: number;
}
