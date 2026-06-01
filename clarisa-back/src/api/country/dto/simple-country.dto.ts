import { ApiProperty } from '@nestjs/swagger';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class SimpleCountryDto {
  @ApiProperty({ example: 170, description: 'Numeric country code.' })
  @OpenSearchProperty({ type: 'integer' })
  code: number;

  @ApiProperty({ example: 'CO', description: 'ISO-3166-1 alpha-2 code.' })
  @OpenSearchProperty({ type: 'keyword' })
  isoAlpha2: string;

  @ApiProperty({ example: 'COL', description: 'ISO-3166-1 alpha-3 code.' })
  @OpenSearchProperty({ type: 'keyword' })
  isoAlpha3: string;

  @ApiProperty({ example: 'Colombia', description: 'Country name.' })
  @OpenSearchProperty({ type: 'text' })
  name: string;
}
