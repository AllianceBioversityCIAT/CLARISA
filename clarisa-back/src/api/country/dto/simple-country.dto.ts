import { ApiProperty } from '@nestjs/swagger';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class SimpleCountryDto {
  @OpenSearchProperty({ type: 'integer' })
  @ApiProperty({
    description: 'The ISO code of the country',
    minimum: 1,
    type: Number,
  })
  code: number;

  @OpenSearchProperty({ type: 'keyword' })
  @ApiProperty({
    description: 'The ISO Alpha-2 code of the country',
    type: String,
  })
  isoAlpha2: string;

  @OpenSearchProperty({ type: 'keyword' })
  @ApiProperty({
    description: 'The ISO Alpha-2 code of the country',
    type: String,
  })
  isoAlpha3: string;

  @OpenSearchProperty({ type: 'text' })
  @ApiProperty({
    description: 'The name of the country',
    type: String,
  })
  name: string;
}
