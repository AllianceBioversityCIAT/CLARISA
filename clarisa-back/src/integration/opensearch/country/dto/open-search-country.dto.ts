import { ApiProperty } from '@nestjs/swagger';
import { OpenSearchProperty } from '../../decorators/opensearch-property.decorator';

export class OpenSearchCountryDto {
  @ApiProperty({
    type: Number,
    description: 'Country id',
    required: true,
  })
  @OpenSearchProperty({ type: 'integer' })
  id: number;

  @ApiProperty({
    type: String,
    description: 'Country name',
    required: true,
  })
  @OpenSearchProperty({ type: 'text' })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Country ISO alpha 2',
    required: true,
  })
  @OpenSearchProperty({ type: 'keyword' })
  iso_alpha_2: string;

  @ApiProperty({
    type: String,
    description: 'Country ISO alpha 3',
    required: true,
  })
  @OpenSearchProperty({ type: 'keyword' })
  iso_alpha_3: string;

  @ApiProperty({
    type: Number,
    description: 'Country ISO numeric',
    required: true,
  })
  @OpenSearchProperty({ type: 'integer' })
  iso_numeric: number;

  @ApiProperty({
    type: Number,
    description: 'Country geoposition id',
    required: true,
  })
  @OpenSearchProperty({ type: 'integer' })
  geoposition_id: number;
}
