import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CollectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label: string;

  @IsOptional()
  @IsBoolean()
  ordered?: boolean;
}

export class UpdateCollectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsBoolean()
  ordered?: boolean;
}

export class CollectionMembersDto {
  @IsArray()
  @ArrayMaxSize(2000)
  @IsInt({ each: true })
  @Min(1, { each: true })
  term_ids: number[];
}

export class ListValueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  list_code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label: string;

  /** Defaults to the slug of the label; immutable once created. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  value?: string;

  @IsOptional()
  @IsInt()
  sort?: number;

  /** Shared by every scheme (scope '') instead of only this one. */
  @IsOptional()
  @IsBoolean()
  shared?: boolean;

  /** Confirms that a list code nobody uses yet starts a new list. */
  @IsOptional()
  @IsBoolean()
  new_list?: boolean;
}

export class UpdateListValueDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
