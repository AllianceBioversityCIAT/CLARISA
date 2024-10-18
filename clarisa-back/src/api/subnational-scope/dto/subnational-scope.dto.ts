import { ApiProperty } from '@nestjs/swagger';
import { SubnationalOtherNameDto } from './subnational-other-name.dto';

export class SubnationalScopeDto {
  @ApiProperty({
    description: 'Unique identifier for the subnational scope',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Code for the subnational scope',
    type: String,
  })
  code: string;

  @ApiProperty({
    description: 'Name of the subnational scope',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'Local name of the subnational scope',
    type: String,
  })
  local_name: string;

  @ApiProperty({
    description: 'Name of the romanization system used',
    type: String,
  })
  romanization_system_name: string;

  @ApiProperty({
    description: 'Other names for the subnational scope',
    type: [SubnationalOtherNameDto],
  })
  other_names: SubnationalOtherNameDto[];

  @ApiProperty({
    description: 'ISO 639-1 language code',
    type: String,
  })
  language_iso_2: string;

  @ApiProperty({
    description: 'Name of the subnational category',
    type: String,
  })
  subnational_category_name: string;

  @ApiProperty({
    description: 'Unique identifier for the country',
    type: Number,
  })
  country_id: number;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    type: String,
  })
  country_iso_alpha_2: string;

  @ApiProperty({ description: 'Name of the country', type: String })
  country_name: string;

  @ApiProperty({
    description: 'Indicates if the subnational scope is active',
    type: Boolean,
  })
  is_active: boolean;
}
