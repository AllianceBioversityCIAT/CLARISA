import { ApiProperty } from '@nestjs/swagger';
import { SimpleCountryDto } from '../../country/dto/simple-country.dto';
import { ParentRegionDto } from './parent-region.dto';

export class RegionDto {
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
    description: 'The UN M49 code of the region',
    type: Number,
  })
  um49Code: number;

  @ApiProperty({
    description: 'The parent of the region',
    type: ParentRegionDto,
    nullable: true,
  })
  parentRegion: ParentRegionDto;

  @ApiProperty({
    description: 'The countries in the region',
    type: [SimpleCountryDto],
  })
  countries: SimpleCountryDto[];
}
