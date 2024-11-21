import { ApiProperty } from '@nestjs/swagger';

export class SubNationalDto {
  @ApiProperty({
    type: Number,
    description: 'Subnational id',
    required: true,
  })
  id: number;

  @ApiProperty({
    type: String,
    description: 'Subnational code',
    required: true,
  })
  code: string;

  @ApiProperty({
    type: String,
    description: 'Subnational name',
    required: true,
  })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Subnational local name',
    required: true,
  })
  local_name: string;

  @ApiProperty({
    type: String,
    description: 'Subnational romanization system name',
    required: true,
  })
  romanization_system_name: string;

  @ApiProperty({
    type: Number,
    description: 'Subnational country id',
    required: true,
  })
  country_id: number;

  @ApiProperty({
    type: Number,
    description: 'Subnational iso language id',
    required: true,
  })
  iso_language_id: number;

  @ApiProperty({
    type: Number,
    description: 'Subnational iso subnational category id',
    required: true,
  })
  iso_subnational_category_id: number;
}

export class OpenSearchCountryDto {
  @ApiProperty({
    type: Number,
    description: 'Country id',
    required: true,
  })
  id: number;

  @ApiProperty({
    type: String,
    description: 'Country name',
    required: true,
  })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Country ISO alpha 2',
    required: true,
  })
  iso_alpha_2: string;

  @ApiProperty({
    type: String,
    description: 'Country ISO alpha 3',
    required: true,
  })
  iso_alpha_3: string;

  @ApiProperty({
    type: Number,
    description: 'Country ISO numeric',
    required: true,
  })
  iso_numeric: number;

  @ApiProperty({
    type: Number,
    description: 'Country geoposition id',
    required: true,
  })
  geoposition_id: number;

  @ApiProperty({
    type: SubNationalDto,
    description: 'Country subnational scope array',
    required: true,
  })
  subnational_scope_array: SubNationalDto[];
}
