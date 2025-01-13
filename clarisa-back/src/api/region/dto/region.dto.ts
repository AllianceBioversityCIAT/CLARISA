import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';
import { SimpleCountryDto } from '../../country/dto/simple-country.dto';
import { ParentRegionDto } from './parent-region.dto';

export class RegionDto {
  @OpenSearchProperty({ type: 'integer' })
  code: number;

  @OpenSearchProperty({ type: 'text' })
  name: string;

  @OpenSearchProperty({ type: 'text' })
  acronym: string;

  @OpenSearchProperty({ type: 'integer' })
  um49Code: number;

  @OpenSearchProperty({ type: 'object', nestedType: ParentRegionDto })
  parentRegion: ParentRegionDto;

  @OpenSearchProperty({ type: 'nested', nestedType: SimpleCountryDto })
  countries: SimpleCountryDto[];
}
