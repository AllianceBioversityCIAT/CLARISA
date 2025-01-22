import { ApiProperty } from '@nestjs/swagger';
import { UnRegionDto } from '../../region/dto/un-region.dto';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class InstitutionCountryDto {
  @OpenSearchProperty({ type: 'integer' })
  @ApiProperty({
    description: 'The code of the institution country',
    type: Number,
    minimum: 1,
  })
  code: number;

  @OpenSearchProperty({ type: 'keyword' })
  @ApiProperty({
    description: 'The ISO Alpha-2 of the country linked to the institution',
    type: String,
  })
  isoAlpha2: string;

  @OpenSearchProperty({ type: 'text' })
  @ApiProperty({
    description: 'The name of the country linked to the institution',
    type: String,
  })
  name: string;

  @OpenSearchProperty({ type: 'integer' })
  @ApiProperty({
    description: `Is this location the institution's HQ?`,
    type: Boolean,
  })
  isHeadquarter: boolean;

  @OpenSearchProperty({ type: 'object', nestedType: UnRegionDto })
  @ApiProperty({
    description: 'The region of the country linked to the institution',
    type: UnRegionDto,
    default: null,
  })
  regionDTO: UnRegionDto = null;
}
