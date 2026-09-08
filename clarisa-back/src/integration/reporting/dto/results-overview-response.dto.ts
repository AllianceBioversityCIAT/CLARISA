import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResultsOverviewItemDto {
  @ApiProperty() result_id: number;
  @ApiProperty() result_code: number;
  @ApiProperty() result_title: string;
  @ApiPropertyOptional() result_description: string | null;

  @ApiProperty() result_type_id: number;
  @ApiProperty({
    description:
      'Result type name (Innovation Development, Innovation Use, Innovation Package)',
  })
  result_type: string;

  @ApiProperty() version_id: number;
  @ApiProperty() phase_name: string;
  @ApiPropertyOptional() phase_year: number | null;

  @ApiProperty() status_id: number;
  @ApiProperty() status_name: string;

  @ApiPropertyOptional() lead_initiative_program_id: number | null;
  @ApiPropertyOptional() lead_initiative_program_official_code: string | null;
  @ApiPropertyOptional() lead_initiative_program_short_name: string | null;

  @ApiPropertyOptional({
    description:
      'Semicolon-separated official codes of contributing science programs',
  })
  contributing_initiative_program_official_codes: string | null;

  @ApiPropertyOptional({
    description:
      'Semicolon-separated short names of contributing science programs',
  })
  contributing_initiative_program_short_names: string | null;

  @ApiPropertyOptional() lead_center_code: string | null;
  @ApiPropertyOptional() lead_center_acronym: string | null;

  @ApiPropertyOptional({
    description: 'Semicolon-separated codes of contributing centers',
  })
  contributing_center_codes: string | null;

  @ApiPropertyOptional({
    description: 'Semicolon-separated acronyms of contributing centers',
  })
  contributing_center_acronyms: string | null;
}

export class PaginationMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() total_pages: number;
}

export class ResultsOverviewPaginatedDto {
  @ApiProperty({ type: [ResultsOverviewItemDto] })
  data: ResultsOverviewItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination: PaginationMetaDto;
}
