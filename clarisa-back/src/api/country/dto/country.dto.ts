import { ApiProperty } from '@nestjs/swagger';
import { GeopositionDto } from '../../geoposition/dto/geoposition.dto';
import { SimpleRegionDto } from '../../region/dto/simple-region.dto';
import { SimpleCountryDto } from './simple-country.dto';

export class CountryDto extends SimpleCountryDto {
  @ApiProperty({
    description: 'The region linked to the country',
    type: SimpleRegionDto,
  })
  regionDTO: SimpleRegionDto;

  @ApiProperty({
    description: 'The location of the country',
    type: GeopositionDto,
  })
  locationDTO: GeopositionDto;
}
