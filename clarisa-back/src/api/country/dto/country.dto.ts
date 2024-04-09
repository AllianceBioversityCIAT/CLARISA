import { GeopositionDto } from '../../geoposition/dto/geoposition.dto';
import { SimpleRegionDto } from '../../region/dto/simple-region.dto';

export class CountryDto {
  code: number;
  isoAlpha2: string;
  isoAlpha3: string;
  name: string;
  regionDTO: SimpleRegionDto;
  locationDTO: GeopositionDto;
}
