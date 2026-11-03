import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { API_KEY_SCOPE_VALUES } from '../constants/api-key-scopes';

/**
 * Editable fields of an existing API key.
 *
 * Every field is optional: a key that is absent from the body is left as it
 * is. `mis_id`, `expires_at`, `scopes`, `allowed_ips` and `allowed_endpoints` also accept `null`
 * (and, for the two scalars, `''`) to CLEAR the stored value, because the
 * panel form always sends every control and an emptied date picker yields
 * `''`, not `undefined` (same lesson as the glossary `reference_date`, CLR-53).
 *
 * The environment is deliberately not editable: it is baked into the key
 * prefix (`cl_prod_…`), so changing it means rotating the key.
 */
export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ValidateIf((o) => o.mis_id !== null && o.mis_id !== '')
  @IsOptional()
  @IsInt()
  @Min(1)
  mis_id?: number | null;

  @ValidateIf((o) => o.scopes !== null)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsIn(API_KEY_SCOPE_VALUES, { each: true })
  scopes?: string[] | null;

  @ValidateIf((o) => o.allowed_ips !== null)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(45, { each: true })
  allowed_ips?: string[] | null;

  @ValidateIf((o) => o.allowed_endpoints !== null)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @Matches(/^\/\S*$/, {
    each: true,
    message: 'each allowed endpoint must be a path starting with /',
  })
  @MaxLength(500, { each: true })
  allowed_endpoints?: string[] | null;

  @ValidateIf((o) => o.expires_at !== null && o.expires_at !== '')
  @IsOptional()
  @IsISO8601()
  expires_at?: string | null;
}
