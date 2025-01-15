import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';
import { RegionDto } from '../../region/dto/region.dto';

export class InstitutionCountryDto {
  @OpenSearchProperty({ type: 'integer' })
  code: number;

  @OpenSearchProperty({ type: 'keyword' })
  isoAlpha2: string;

  @OpenSearchProperty({ type: 'text' })
  name: string;

  @OpenSearchProperty({ type: 'integer' })
  isHeadquarter: boolean;

  @OpenSearchProperty({ type: 'object', nestedType: RegionDto })
  regionDTO: RegionDto = null;
}
