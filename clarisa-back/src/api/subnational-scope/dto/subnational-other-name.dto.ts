import { ApiProperty } from '@nestjs/swagger';

export class SubnationalOtherNameDto {
  @ApiProperty({ description: 'Name of the subnational entity', type: String })
  name: string;

  @ApiProperty({
    description: 'Local name of the subnational entity',
    type: String,
  })
  local_name: string;

  @ApiProperty({
    description: 'Name of the romanization system used',
    type: String,
  })
  romanization_system_name: string;

  @ApiProperty({ description: 'ISO 639-1 language code', type: String })
  language_iso_2: string;
}
