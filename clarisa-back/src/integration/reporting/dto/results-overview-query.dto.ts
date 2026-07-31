import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ResultsOverviewQueryDto {
  @ApiPropertyOptional({ description: 'Filter by phase/version ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  version_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by one or more status IDs',
    type: [Number],
    example: [1, 2],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map(Number);
    return [Number(value)];
  })
  @IsArray()
  @IsInt({ each: true })
  status_id?: number[];

  @ApiPropertyOptional({
    description:
      'Filter by result type ID. View exposes types 2 (Innovation Use), 7 (Innovation Development), 10 (Innovation Use IPSR)',
    type: [Number],
    example: [2, 7],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map(Number);
    return [Number(value)];
  })
  @IsArray()
  @IsInt({ each: true })
  result_type_id?: number[];

  @ApiPropertyOptional({
    description:
      'Filter by initiative/science-program ID (lead or contributing)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  initiative_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by center code (lead or contributing)',
    example: 'CIP',
  })
  @IsOptional()
  @IsString()
  center_code?: string;

  @ApiPropertyOptional({
    description: 'Full-text search on result title and description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}
