import { ApiProperty } from '@nestjs/swagger';
import { GeopositionDto } from '../../geoposition/dto/geoposition.dto';
import { SimpleRegionDto } from '../../region/dto/simple-region.dto';

export class CountryDto {
  @ApiProperty({
    example: 170,
    description: 'Codigo numerico del pais (estandar UN M49 / ISO-3166 numeric).',
  })
  code: number;

  @ApiProperty({
    example: 'CO',
    description: 'Codigo ISO-3166-1 alpha-2 (dos letras).',
  })
  isoAlpha2: string;

  @ApiProperty({
    example: 'COL',
    description: 'Codigo ISO-3166-1 alpha-3 (tres letras).',
  })
  isoAlpha3: string;

  @ApiProperty({
    example: 'Colombia',
    description: 'Nombre oficial del pais en ingles.',
  })
  name: string;

  @ApiProperty({
    type: () => SimpleRegionDto,
    description: 'Region UN (estandar M49) a la que pertenece el pais.',
  })
  regionDTO: SimpleRegionDto;

  @ApiProperty({
    type: () => GeopositionDto,
    description: 'Geoposicion (latitud / longitud) asociada al pais.',
  })
  locationDTO: GeopositionDto;
}
