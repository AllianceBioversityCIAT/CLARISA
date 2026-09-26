import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
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
