import {
  ArrayMaxSize,
  ArrayUnique,
  IsIn,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  Max,
  Min,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Headers of the uploaded sheet plus up to 5 sample rows (only these reach the model). */
export class MapColumnsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  headers: string[];

  @IsArray()
  @ArrayMaxSize(5)
  @IsArray({ each: true })
  rows: unknown[][] = [];
}

export class NormalizeValuesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  list: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  values: string[];
}

/** Rows of the import wizard, one object per row keyed by schema field. */
export class ImportConceptsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(2000)
  @IsObject({ each: true })
  rows: Record<string, unknown>[];

  @IsOptional()
  @IsBoolean()
  skip_invalid?: boolean;
}

export class SemanticSearchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  text: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

/** The fields an AI draft can write; everything else stays an editor's text. */
export const AI_DRAFT_FIELDS = [
  'short_definition',
  'scope_note',
  'example_of_use',
] as const;
export type AiDraftField = (typeof AI_DRAFT_FIELDS)[number];

/** Only the label and the definition reach the model: no emails, no notes. */
export class AiDraftDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  preferred_label: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  definition: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(AI_DRAFT_FIELDS, { each: true })
  fields: AiDraftField[];
}
