import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Maximum amount of rows accepted in a single bulk operation. Keeps the
 * payload and the transaction bounded; the front splits bigger files.
 */
export const GLOSSARY_BULK_MAX_ROWS = 2000;

/**
 * What to do when an incoming term already exists in the glossary
 * (case-insensitive match on `title`).
 */
export enum GlossaryBulkConflictPolicy {
  /** Leave the stored term untouched. */
  SKIP = 'skip',
  /** Overwrite the definition and replace the portfolio assignment. */
  UPDATE = 'update',
}

/** Outcome computed for every incoming row during preview / import. */
export enum GlossaryBulkRowAction {
  CREATE = 'create',
  UPDATE = 'update',
  /**
   * The term exists but was deactivated on purpose. Importing it brings it
   * back to the public glossary, so it is reported apart from a plain update
   * instead of resurrecting it silently.
   */
  REACTIVATE = 'reactivate',
  SKIP = 'skip',
  INVALID = 'invalid',
}

export class GlossaryTermPortfolioDto {
  id: number;
  name: string;
  acronym: string;
}

/** Admin-facing representation of a glossary term (includes the id). */
export class GlossaryAdminDto {
  id: number;
  term: string;
  definition: string;
  is_active: boolean;
  show_in_dashboard: boolean;
  application_name: string;
  portfolios: GlossaryTermPortfolioDto[];
}

export class CreateGlossaryTermDto {
  @IsString()
  @IsNotEmpty({ message: 'The term is required' })
  @MaxLength(500)
  term: string;

  @IsString()
  @IsNotEmpty({ message: 'The definition is required' })
  definition: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  portfolio_ids?: number[];

  @IsOptional()
  @IsBoolean()
  show_in_dashboard?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  application_name?: string;
}

export class UpdateGlossaryTermDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'The term cannot be empty' })
  @MaxLength(500)
  term?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'The definition cannot be empty' })
  definition?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  portfolio_ids?: number[];

  @IsOptional()
  @IsBoolean()
  show_in_dashboard?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  application_name?: string;
}

export class UpdateGlossaryStatusDto {
  @IsBoolean()
  is_active: boolean;
}

/** A single row coming from the uploaded/pasted file. */
export class GlossaryBulkRowDto {
  @IsString()
  term: string;

  @IsString()
  definition: string;

  /**
   * Per-row portfolios. When absent, the batch-level `portfolio_ids` apply.
   * Lets a file drive the assignment column by column if the user maps one.
   */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  portfolio_ids?: number[];
}

export class GlossaryBulkDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one row is required' })
  @ArrayMaxSize(GLOSSARY_BULK_MAX_ROWS, {
    message: `A maximum of ${GLOSSARY_BULK_MAX_ROWS} rows can be processed at once`,
  })
  @ValidateNested({ each: true })
  @Type(() => GlossaryBulkRowDto)
  rows: GlossaryBulkRowDto[];

  /** Portfolios applied to every row that does not bring its own. */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  portfolio_ids?: number[];

  @IsOptional()
  @IsEnum(GlossaryBulkConflictPolicy)
  on_conflict?: GlossaryBulkConflictPolicy;

  @IsOptional()
  @IsBoolean()
  show_in_dashboard?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  application_name?: string;
}

/** Result computed for one row, returned by both preview and import. */
export class GlossaryBulkRowResultDto {
  /** 1-based index of the row as it arrived from the front. */
  index: number;
  term: string;
  definition: string;
  action: GlossaryBulkRowAction;
  /** Id of the affected record. Null for `create` in preview mode. */
  glossary_id: number | null;
  /** Definition currently stored, when the term already exists. */
  current_definition?: string;
  portfolios: GlossaryTermPortfolioDto[];
  /** Human readable reason when the action is `invalid` or `skip`. */
  message?: string;
}

export class GlossaryBulkResultDto {
  summary: {
    total: number;
    to_create: number;
    to_update: number;
    to_reactivate: number;
    skipped: number;
    invalid: number;
  };
  /** True when the operation was actually persisted. */
  applied: boolean;
  rows: GlossaryBulkRowResultDto[];
}
