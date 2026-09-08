import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';
import { InstitutionTypeDto } from '../../institution-type/dto/institution-type.dto';
import { InstitutionCountryDto } from './institution-country.dto';
import { InstitutionLineageDto } from './institution-lineage.dto';

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

  // validity period. `endDate` null means the institution is still valid and
  // consumable; a date means it must no longer be used, and `replacedBy` says
  // what to use instead.
  @OpenSearchProperty({ type: 'date' })
  startDate: string;

  @OpenSearchProperty({ type: 'date' })
  endDate: string;

  @OpenSearchProperty({ type: 'text' })
  validityStatus: string;

  // lineage, resolved one hop. Always arrays, never null.
  @OpenSearchProperty({ type: 'nested', nestedType: InstitutionLineageDto })
  replacedBy: InstitutionLineageDto[];

  @OpenSearchProperty({ type: 'nested', nestedType: InstitutionLineageDto })
  replaces: InstitutionLineageDto[];

  // derived from the lineage: the acronyms and names this institution used to
  // be known by, so a consumer resolving by acronym still finds it after a
  // rename.
  @OpenSearchProperty({ type: 'text' })
  previousAcronyms: string[];

  @OpenSearchProperty({ type: 'text' })
  previousNames: string[];
}
