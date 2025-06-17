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
  id: number;
  result_code: number;
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
  gender_assessment: AssessmentDto;
  climate_adaptability: AssessmentDto;
  cost: CostDto;
}

export class InnovationDevelopmentDto extends InnovationBaseDto {
  actors: ActorDto[] | string[];
  organizations: OrganizationDto[] | string[];
  other_quantitative: QuantitativeDto[] | string[];
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

export type InnovationData =
  | InnovationDevelopmentDto
  | InnovationUseDto
  | InnovationPackageDto;
