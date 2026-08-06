/**
 * One hop of the lineage graph, as published by the API.
 *
 * Maps to `dcterms:isReplacedBy` when it appears inside `replacedBy`, and to
 * `dcterms:replaces` when it appears inside `replaces`.
 */
export class InstitutionLineageDto {
  /** id of the institution at the other end of the edge */
  code: number;

  name: string;

  acronym: string;

  /** MERGE | SPLIT | SUCCESSOR | NEW — 'NEW' means a plain rename */
  relationType: string;

  /** date of the real-world change, ISO yyyy-MM-dd */
  changeDate: string;
}
