import { ApiProperty } from '@nestjs/swagger';
import { SimpleCountryDto } from '../../country/dto/simple-country.dto';

export class CgiarRegionDto {
  @ApiProperty({
    description: 'The id of the region',
    type: Number,
    minimum: 1,
  })
  code: number;

  @ApiProperty({
    description: 'The name of the region',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The acronym of the region',
    type: String,
  })
  acronym: string;

  @ApiProperty({
    description: 'The countries in the region',
    type: [SimpleCountryDto],
  })
  countries: SimpleCountryDto[];
}
