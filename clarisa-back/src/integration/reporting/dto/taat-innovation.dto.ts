export class ActorDto {
  actor_type: string;
  other_actor_type?: string;
  women?: number;
  women_youth?: number;
  men?: number;
  men_youth?: number;
  how_many: number;
  sex_age_disaggregation_applies: boolean;
}

export class OrganizationDto {
  institution_type: string;
  other_institution?: string;
  how_many: number;
  graduate_students?: number;
}

export class QuantitativeDto {
  unit_of_measure: string;
  quantity: number;
}

export class EndUsersDto {
  actors: ActorDto[] | string[];
  organizations: OrganizationDto[] | string[];
  other_quantitative: QuantitativeDto[] | string[];
}

export class GeographicDto {
  geographic_focus: string;
  regions: string[];
  countries: string[];
}

export class SdgDto {
  sdg_target_code: string;
  sdg_target: string;
}

export class AssessmentDto {
  description: string | null;
  evidence_links: string[];
}

export class AssociatedTechnologyDto {
  result_code: number;
  title: string;
  innovation_type?: string;
}

export class InvestmentDto {
  official_code?: string;
  name?: string;
  grant_title?: string;
  institution_name?: string;
  total_value: string | null;
}

export class CostDto {
  initiatives_investment: InvestmentDto[] | string[];
  npp_investment: InvestmentDto[] | string[];
  partner_investment: InvestmentDto[] | string[];
}

export class MaturityLevelDto {
  id: number;
  name: string;
  definition: string;
  level: number;
}

export class InnovationBaseDto {
  /** PRMS result ID. Changes with every reporting phase (version) of the same innovation. */
  id: number;
  /** Stable identifier of the innovation across phases. Use it to track an innovation over the years. */
  result_code: number;
  /** Phase year of this version. When a result_code appears more than once, keep the record with the highest result_year. */
  result_year: number;
  commercial_name: string;
  technology_name: string;
  slogan: string;
  contact_person_name: string;
  contact_person_email: string;
  description: string;
  associated_technology: AssociatedTechnologyDto[];
  intellectual_property: string[] | string;
  where_has_the_technology: GeographicDto;
  sdg: SdgDto[] | string[];
  dac_score: DacScoreDto[];
  cost: CostDto;
  /**
   * PRMS PDF report of this exact version: `{base}/{result_code}?phase={version_id}`.
   * Development and use: `https://reporting.cgiar.org/reports/result-details/`.
   * Package: `https://reporting.cgiar.org/reports/ipsr-details/`.
   * Use it as provided; a link built from result_code alone does not point to a specific phase.
   */
  pdf_link: string;
}

export class InnovationDevelopmentDto extends InnovationBaseDto {
  end_users: EndUsersDto;
  environment_biodiversity: AssessmentDto;
  idea_maturity_level_of_use: string;
  scalling_readiness_reference: MaturityLevelDto | string;
}

export class InnovationUseDto extends InnovationBaseDto {
  end_users: EndUsersDto;
  biodiversity_environment: AssessmentDto;
  idea_maturity_level_of_use: string;
  scalling_readiness_reference: string;
}

export class InnovationPackageDto extends InnovationBaseDto {
  end_users: EndUsersDto;
  environment: AssessmentDto;
  biodiversity: AssessmentDto;
  idea_maturity_level_of_use: MaturityLevelDto;
  scalling_readiness_reference: MaturityLevelDto;
}

export class InnovationResponseDto {
  innovation_data:
    | InnovationDevelopmentDto
    | InnovationUseDto
    | InnovationPackageDto;
}

export class DacScoreDto {
  name: string;
  description: string | null;
  evidence_links: string[];
}

export type InnovationData =
  | InnovationDevelopmentDto
  | InnovationUseDto
  | InnovationPackageDto;
