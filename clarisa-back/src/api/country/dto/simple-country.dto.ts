import { ApiProperty } from '@nestjs/swagger';
import { OpenSearchProperty } from '../../../integration/opensearch/decorators/opensearch-property.decorator';

export class SimpleCountryDto {
  @ApiProperty({
    description: 'The ISO code of the country',
    minimum: 1,
    type: Number,
  })
  @OpenSearchProperty({ type: 'integer' })
  code: number;

  @ApiProperty({
    description: 'The ISO Alpha-2 code of the country',
    type: String,
  })
  @OpenSearchProperty({ type: 'keyword' })
  isoAlpha2: string;

  @ApiProperty({
    description: 'The ISO Alpha-2 code of the country',
    type: String,
  })
  @OpenSearchProperty({ type: 'keyword' })
  isoAlpha3: string;

  @ApiProperty({
    description: 'The name of the country',
    type: String,
  })
  @OpenSearchProperty({ type: 'text' })
  name: string;
}
