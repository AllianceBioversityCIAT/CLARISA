import { SubnationalOtherNameDto } from './subnational-other-name.dto';

export class SubnationalScopeDto {
  id: number;
  code: string;
  name: string;
  local_name: string;
  romanization_system_name: string;
  other_names: SubnationalOtherNameDto[];
  language_iso_2: string;
  subnational_category_name: number;
  country_id: string;
  country_iso_alpha_2: string;
  country_name: string;
}
