import { OpenSearchProperty } from '../../decorators/opensearch-property.decorator';

export class OtherNamesDto {
  @OpenSearchProperty({ type: 'text' })
  public name: string;

  @OpenSearchProperty({ type: 'text' })
  public local_name: string;

  @OpenSearchProperty({ type: 'text' })
  public language_iso_2: string;

  @OpenSearchProperty({ type: 'text' })
  public romanization_system_name: string;
}

export class OpenSearchSubnationalDto {
  @OpenSearchProperty({ type: 'integer' })
  public id: number;

  @OpenSearchProperty({ type: 'keyword' })
  public code: string;

  @OpenSearchProperty({ type: 'text' })
  public name: string;

  @OpenSearchProperty({ type: 'integer' })
  public is_active: number;

  @OpenSearchProperty({ type: 'integer' })
  public country_id: number;

  @OpenSearchProperty({ type: 'text' })
  public local_name: string;

  @OpenSearchProperty({ type: 'nested', nestedType: OtherNamesDto })
  public other_names: OtherNamesDto[];

  @OpenSearchProperty({ type: 'text' })
  public country_name: string;

  @OpenSearchProperty({ type: 'text' })
  public language_iso_2: string;

  @OpenSearchProperty({ type: 'keyword' })
  public country_iso_alpha_2: string;

  @OpenSearchProperty({ type: 'text' })
  public romanization_system_name: string;

  @OpenSearchProperty({ type: 'text' })
  public subnational_category_name: string;
}
