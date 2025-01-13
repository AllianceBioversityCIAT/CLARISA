import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';
import { InstitutionTypeDto } from '../../institution-type/dto/institution-type.dto';
import { InstitutionCountryDto } from './institution-country.dto';

export class InstitutionDto {
  @OpenSearchProperty({ type: 'integer' })
  code: number;

  @OpenSearchProperty({ type: 'text' })
  name: string;

  @OpenSearchProperty({ type: 'text' })
  acronym: string;

  @OpenSearchProperty({ type: 'text' })
  websiteLink: string;

  @OpenSearchProperty({ type: 'date' })
  added: Date;

  @OpenSearchProperty({ type: 'object', nestedType: InstitutionTypeDto })
  institutionType: InstitutionTypeDto;

  @OpenSearchProperty({ type: 'nested', nestedType: InstitutionCountryDto })
  countryOfficeDTO: InstitutionCountryDto[];

  @OpenSearchProperty({ type: 'integer' })
  is_active?: boolean;
}
