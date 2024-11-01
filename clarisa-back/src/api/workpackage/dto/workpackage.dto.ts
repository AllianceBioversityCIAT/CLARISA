import { ApiProperty } from '@nestjs/swagger';
import { WorkpackageCountryDto } from './workpackage-country.dto';
import { WorkpackageRegionDto } from './workpackage-region.dto';

export class WorkpackageDto {
  @ApiProperty({
    description: 'The id of the initiative',
    minimum: 1,
    type: Number,
  })
  initiative_id: number;

  @ApiProperty({
    description: 'The official code of the initiative',
    type: String,
  })
  initiative_offical_code: string;

  @ApiProperty({
    description: 'The id of the stage',
    minimum: 1,
    type: Number,
  })
  stage_id: number;

  @ApiProperty({
    description: 'The status of the initiative',
    type: String,
  })
  initiative_status: string;

  @ApiProperty({
    description: 'The official code of the workpackage',
    type: String,
  })
  wp_official_code: string;

  @ApiProperty({
    description: 'The id of the workpackage',
    minimum: 1,
    type: Number,
  })
  wp_id: number;

  @ApiProperty({
    description: 'The name of the workpackage',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The acronym of the workpackage',
    type: String,
  })
  acronym: string;

  @ApiProperty({
    description: 'The results of the workpackage',
    type: String,
  })
  results: string;

  @ApiProperty({
    description: 'The narrative of the workpackage',
    type: String,
  })
  pathway_content: string;

  @ApiProperty({
    description: 'Is the workpackage global?',
    type: Boolean,
  })
  is_global: number;

  @ApiProperty({
    description: 'The regions linked to the workpackage',
    type: [WorkpackageRegionDto],
  })
  regions: WorkpackageRegionDto[];

  @ApiProperty({
    description: 'The countries linked to the workpackage',
    type: [WorkpackageCountryDto],
  })
  countries: WorkpackageCountryDto[];

  @ApiProperty({
    description: 'Is the workpackage active?',
    type: Boolean,
  })
  status: number;
}
