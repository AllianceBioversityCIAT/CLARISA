import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/** `''` / `null` pass so a PATCH can clear an optional field. */
const clearable = (_: unknown, v: unknown) => v !== '' && v !== null;
const HTTP = /^https?:\/\/\S+$/i;

/**
 * One icon of a concept, named as the schema's "Icon register" sheet.
 * `icon_status` and `file_format` are checked against the lists `icon_status`
 * and `icon_format` by the service (lists are data), and so is the rule that
 * a `final` icon carries alt text: it depends on the merged state of a PATCH.
 */
export class IconFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  file_format?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  designer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  designer_country?: string;

  @IsOptional()
  @ValidateIf(clearable)
  @IsInt()
  @Min(1900)
  @Max(2200)
  @Type(() => Number)
  year_created?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  rights_and_licence?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  alt_text?: string;

  @IsOptional()
  @ValidateIf(clearable)
  @MaxLength(1000)
  @Matches(HTTP, { message: 'file_link_primary must be an http(s) URL' })
  file_link_primary?: string;

  @IsOptional()
  @ValidateIf(clearable)
  @MaxLength(1000)
  @Matches(HTTP, { message: 'file_link_backup must be an http(s) URL' })
  file_link_backup?: string;

  @IsOptional()
  @ValidateIf(clearable)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date_added must be YYYY-MM-DD' })
  date_added?: string;
}

export class IconDto extends IconFieldsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  icon_status: string;
}

/** Same fields, all optional; the alt-text rule is checked on the result. */
export class UpdateIconDto extends IconFieldsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  icon_status?: string;
}
