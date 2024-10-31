import { ApiProperty } from '@nestjs/swagger';
import { BaseParamsDto } from '../../../shared/entities/dtos/base-params.dto';

export class SubnationalFindAllParamsDto extends BaseParamsDto {
  @ApiProperty({
    description: 'Show subnational scopes for a specific country by its id.',
    required: false,
    type: Number,
  })
  country_id: number;

  @ApiProperty({
    description:
      'Show subnational scopes for a specific country by its ISO alpha-2 code.',
    required: false,
    type: String,
  })
  country_iso_alpha_2: string;
}
