export class InitiativeEoiOstDto {
  initiative_id: number;
  initiative_official_code: string;
  initiative_name: string;
  stage_name: string;
  eoi_o: EOI[];
}

export class EOI {
  toc_result_id: string;
  short_title: string;
  outcome_statement: string;
}

export type InitiativeEoiResponse = {
  eoi_outcome_by_initiatives: InitiativeEoiOstDto[];
};
