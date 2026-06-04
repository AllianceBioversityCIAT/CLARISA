import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { API_KEY_SCOPE_VALUES } from '../constants/api-key-scopes';

export class CreateApiKeyDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  mis_id?: number;

  /** Permissions for CLARISA endpoints and MS capabilities (see GET /api/api-keys/scopes) */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsIn(API_KEY_SCOPE_VALUES, { each: true })
  scopes?: string[];

  /** Environment acronym from `environments` table (same as MIS), e.g. PROD, DEV, TEST */
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  environment: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(45, { each: true })
  allowed_ips?: string[];

  @IsOptional()
  @IsISO8601()
  expires_at?: string;
}
