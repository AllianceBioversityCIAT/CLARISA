import { CountryDto } from '../../country/dto/country.dto';
import { InstitutionDto } from '../../institution/dto/institution.dto';

export class CountryOfficeRequestDto {
  id: number;
  institutionDTO: InstitutionDto;
  countryDTO: CountryDto;
  requestStatus: string;
  requestJustification: string;
  requestSource?: string;
  externalUserMail: string;
  externalUserName: string;
  externalUserComments: string;
}
