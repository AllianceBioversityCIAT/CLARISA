import { OpenSearchProperty } from '../../decorators/opensearch-property.decorator';

export class OpenSearchSubnationalDto {
  @OpenSearchProperty({ type: 'integer' })
  public id: number;

  @OpenSearchProperty({ type: 'keyword' })
  public code: string;

  @OpenSearchProperty({ type: 'text' })
  public name: string;

  @OpenSearchProperty({ type: 'text' })
  public local_name: string;

  @OpenSearchProperty({ type: 'text' })
  public romanization_system_name: string;

  @OpenSearchProperty({ type: 'keyword' })
  public iso_alpha_2: string;

  @OpenSearchProperty({ type: 'integer' })
  public iso_language_id: number;
}
