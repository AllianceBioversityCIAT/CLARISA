import { InstitutionTypeDto } from '../../institution-type/dto/institution-type.dto';
import { InstitutionCountryDto } from './institution-country.dto';

export class InstitutionDto {
  code: number;
  name: string;
  acronym: string;
  websiteLink: string;
  added: Date;
  institutionType: InstitutionTypeDto;
  countryOfficeDTO: InstitutionCountryDto[];
  is_active?: boolean;
}
