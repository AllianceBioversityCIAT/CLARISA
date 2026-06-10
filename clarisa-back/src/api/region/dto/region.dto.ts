import { ApiProperty } from '@nestjs/swagger';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';
import { SimpleCountryDto } from '../../country/dto/simple-country.dto';
import { ParentRegionDto } from './parent-region.dto';

export class RegionDto {
  @ApiProperty({ example: 5, description: 'Internal region code.' })
  @OpenSearchProperty({ type: 'integer' })
  code: number;

  @ApiProperty({ example: 'Latin America and the Caribbean', description: 'Region name.' })
  @OpenSearchProperty({ type: 'text' })
  name: string;

  @ApiProperty({ example: 'LAC', description: 'Region acronym.' })
  @OpenSearchProperty({ type: 'text' })
  acronym: string;

  @ApiProperty({ example: 419, description: 'UN M49 code of the region.' })
  @OpenSearchProperty({ type: 'integer' })
  um49Code: number;

  @ApiProperty({ type: () => ParentRegionDto, description: 'Parent region (M49 hierarchy).' })
  @OpenSearchProperty({ type: 'object', nestedType: ParentRegionDto })
  parentRegion: ParentRegionDto;

  @ApiProperty({ type: () => SimpleCountryDto, isArray: true, description: 'Countries that belong to the region.' })
  @OpenSearchProperty({ type: 'nested', nestedType: SimpleCountryDto })
  countries: SimpleCountryDto[];
}
