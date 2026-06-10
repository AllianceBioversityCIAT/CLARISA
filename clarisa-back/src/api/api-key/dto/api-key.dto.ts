export class ApiKeyDto {
  id: number;
  name: string;
  key_prefix: string;
  mis_id?: number;
  mis_acronym?: string;
  mis_name?: string;
  scopes?: string[];
  environment?: string;
  environment_id?: number;
  allowed_ips?: string[];
  expires_at?: Date;
  last_used_at?: Date;
  usage_count: number;
  is_active: boolean;
  created_at?: Date;
}

export class CreateApiKeyResponseDto extends ApiKeyDto {
  key: string;
}
