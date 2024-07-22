import { ApiProperty } from '@nestjs/swagger';
import { RegionDto } from '../../region/dto/region.dto';

export class InstitutionCountryDto {
  @ApiProperty({
    description: 'The code of the institution country',
    type: Number,
    minimum: 1,
  })
  code: number;

  @ApiProperty({
    description: 'The ISO Alpha-2 of the country linked to the institution',
    type: String,
  })
  isoAlpha2: string;

  @ApiProperty({
    description: 'The name of the country linked to the institution',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: `Is this location the institution's HQ?`,
    type: Boolean,
  })
  isHeadquarter: boolean;

  @ApiProperty({
    description: 'The region of the country linked to the institution',
    type: RegionDto,
    default: null,
  })
  regionDTO: RegionDto = null;
}
