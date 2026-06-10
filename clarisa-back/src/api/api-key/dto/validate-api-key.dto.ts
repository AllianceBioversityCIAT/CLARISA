import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsKnownApiKeyScope } from '../validators/is-known-api-key-scope.validator';

export class ValidateApiKeyDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  api_key: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsKnownApiKeyScope()
  required_scope?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  microservice_name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  endpoint_accessed: string;

  @IsOptional()
  @IsString()
  @MaxLength(45)
  ip_address?: string;
}
