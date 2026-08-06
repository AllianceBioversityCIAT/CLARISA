import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

/**
 * One hop of the lineage graph, as published by the API.
 *
 * Maps to `dcterms:isReplacedBy` when it appears inside `replacedBy`, and to
 * `dcterms:replaces` when it appears inside `replaces`.
 *
 * The fields are decorated like every other nested DTO in this catalogue:
 * `InstitutionDto` declares `replacedBy`/`replaces` as `nested`, and the index
 * schema builder reads this metadata to fill in their sub-properties. Without
 * it the index would be created with an empty `properties: {}` and OpenSearch
 * would have to guess each type.
 */
export class InstitutionLineageDto {
  /** id of the institution at the other end of the edge */
  @OpenSearchProperty({ type: 'integer' })
  code: number;

  @OpenSearchProperty({ type: 'text' })
  name: string;

  @OpenSearchProperty({ type: 'text' })
  acronym: string;

  /** MERGE | SPLIT | SUCCESSOR | NEW — 'NEW' means a plain rename */
  @OpenSearchProperty({ type: 'keyword' })
  relationType: string;

  /** date of the real-world change, ISO yyyy-MM-dd */
  @OpenSearchProperty({ type: 'date' })
  changeDate: string;
}
