import { ApiProperty } from '@nestjs/swagger';
import { GeopositionDto } from '../../geoposition/dto/geoposition.dto';
import { SimpleRegionDto } from '../../region/dto/simple-region.dto';

export class CountryDto {
  @ApiProperty({
    example: 170,
    description: 'Numeric country code (UN M49 / ISO-3166 numeric standard).',
  })
  code: number;

  @ApiProperty({
    example: 'CO',
    description: 'ISO-3166-1 alpha-2 code (two letters).',
  })
  isoAlpha2: string;

  @ApiProperty({
    example: 'COL',
    description: 'ISO-3166-1 alpha-3 code (three letters).',
  })
  isoAlpha3: string;

  @ApiProperty({
    example: 'Colombia',
    description: 'Official country name in English.',
  })
  name: string;

  @ApiProperty({
    type: () => SimpleRegionDto,
    description: 'UN region (M49 standard) the country belongs to.',
  })
  regionDTO: SimpleRegionDto;

  @ApiProperty({
    type: () => GeopositionDto,
    description: 'Geoposition (latitude / longitude) associated with the country.',
  })
  locationDTO: GeopositionDto;
}
