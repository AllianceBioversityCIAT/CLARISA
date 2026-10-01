import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { GcFieldType } from '../entities/gc-field.entity';

export class CreateFieldDto {
  /** Slug; the service checks its shape and that it is free in the scheme. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label: string;

  @IsEnum(GcFieldType)
  type: GcFieldType;

  /** Required for `list` / `multi_list`, refused for every other type. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  list_code?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  help?: string;
}

/**
 * What can change after creation. `code` and `type` are left out on purpose:
 * the controller's `forbidNonWhitelisted` answers 400 when they are sent,
 * because the values already stored under that key depend on both.
 */
export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  help?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
