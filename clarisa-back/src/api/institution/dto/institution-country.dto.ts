import { ApiProperty } from '@nestjs/swagger';
import { UnRegionDto } from '../../region/dto/un-region.dto';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class InstitutionCountryDto {
  @ApiProperty({
    description: 'The code of the institution country',
    type: Number,
    minimum: 1,
  })
  @OpenSearchProperty({ type: 'integer' })
  code: number;

  @ApiProperty({
    description: 'The ISO Alpha-2 of the country linked to the institution',
    type: String,
  })
  @OpenSearchProperty({ type: 'keyword' })
  isoAlpha2: string;

  @ApiProperty({
    description: 'The name of the country linked to the institution',
    type: String,
  })
  @OpenSearchProperty({ type: 'text' })
  name: string;

  @ApiProperty({
    description: `Is this location the institution's HQ?`,
    type: Boolean,
  })
  @OpenSearchProperty({ type: 'integer' })
  isHeadquarter: boolean;

  @ApiProperty({
    description: 'The region of the country linked to the institution',
    type: UnRegionDto,
    default: null,
  })
  @OpenSearchProperty({ type: 'object', nestedType: UnRegionDto })
  regionDTO: UnRegionDto = null;
}
