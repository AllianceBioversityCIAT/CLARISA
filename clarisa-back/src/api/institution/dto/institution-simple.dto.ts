import { ApiProperty, OmitType } from '@nestjs/swagger';
import { InstitutionDto } from './institution.dto';

export class InstitutionSimpleDto extends OmitType(InstitutionDto, [
  'added',
  'institutionType',
  'countryOfficeDTO',
]) {
  @ApiProperty({
    description: 'The id of the institution type',
    type: Number,
    minimum: 1,
  })
  institutionTypeId: number;

  @ApiProperty({
    description: 'The name of the institution type',
    type: String,
  })
  name: string;
  institutionType: string;

  @ApiProperty({
    description:
      "The name of the country where the institution's HQ is located",
    type: String,
  })
  hqLocation: string;

  @ApiProperty({
    description:
      "The ISO Alpha-2 of the country where the institution's HQ is located",
    type: String,
  })
  hqLocationISOalpha2: string;
}
