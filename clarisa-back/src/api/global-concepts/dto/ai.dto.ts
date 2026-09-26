import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
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
