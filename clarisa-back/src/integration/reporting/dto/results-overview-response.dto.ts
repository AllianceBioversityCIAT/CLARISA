import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResultsOverviewItemDto {
  @ApiProperty() result_id: number;
  @ApiProperty() result_code: number;
  @ApiProperty() result_title: string;
  @ApiPropertyOptional() result_description: string | null;

  @ApiProperty() version_id: number;
  @ApiProperty() phase_name: string;
  @ApiPropertyOptional() phase_year: number | null;

  @ApiProperty() status_id: number;
  @ApiProperty() status_name: string;

  @ApiPropertyOptional() lead_initiative_program_id: number | null;
  @ApiPropertyOptional() lead_initiative_program_official_code: string | null;
  @ApiPropertyOptional() lead_initiative_program_short_name: string | null;

  @ApiPropertyOptional({
    description: 'Semicolon-separated contributing initiative IDs',
  })
  contributing_initiative_program_ids: string | null;

  @ApiPropertyOptional({
    description: 'Semicolon-separated contributing initiative official codes',
  })
  contributing_initiative_program_official_codes: string | null;

  @ApiPropertyOptional({
    description: 'Semicolon-separated contributing initiative short names',
  })
  contributing_initiative_program_short_names: string | null;

  @ApiPropertyOptional() lead_center_code: string | null;
  @ApiPropertyOptional() lead_center_acronym: string | null;

  @ApiPropertyOptional({
    description: 'Semicolon-separated contributing center codes',
  })
  contributing_center_codes: string | null;

  @ApiPropertyOptional({
    description: 'Semicolon-separated contributing center acronyms',
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
